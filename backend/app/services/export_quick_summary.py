"""用途：製作 PDF 第一頁的看診快速摘要，完整資料仍保留於後續明細。"""
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepInFrame, Paragraph, Spacer, Table, TableStyle


def build_quick_summary(data, *, font, report_period, export_time, date_fields, date_label, escape_text):
    body = ParagraphStyle("quick-body", fontName=font, fontSize=9, leading=13,
                          textColor=colors.black, wordWrap="CJK")
    title = ParagraphStyle("quick-title", parent=body, fontSize=19, leading=25, spaceAfter=4)
    pet_title = ParagraphStyle("quick-pet", parent=body, fontSize=12, leading=16, spaceAfter=3)

    def clip(value, limit=72):
        text = str(value if value not in (None, "") else "未填寫").replace("\n", " ").strip()
        return escape_text(text if len(text) <= limit else f"{text[:limit - 1]}…")

    def pet_card(pet):
        groups = {
            key: sorted((item for item in data.get(key, []) if item.get("petId") == pet.get("id")),
                        key=lambda item: str(item.get(field) or ""), reverse=True)
            for key, field in date_fields.items()
        }
        gender = {"male": "公", "female": "母"}.get(pet.get("gender"), "性別未填寫")
        neutered = "已結紮" if pet.get("neutered") is True else "未結紮" if pet.get("neutered") is False else "結紮狀態未填寫"
        identity = f"{pet.get('breed') or '品種未填寫'}・{gender}・{neutered}・生日 {date_label(pet.get('birthday'))}"
        lines = [Paragraph(f"<b>基本資料</b>　{clip(identity, 90)}", body)]
        lines.append(Paragraph(f"<b>過敏</b>　{clip(pet.get('allergies'), 55)}　　<b>慢性病</b>　{clip(pet.get('chronicDiseases'), 55)}", body))
        if groups["healthEvents"]:
            event = groups["healthEvents"][0]
            lines.append(Paragraph(f"<b>最近健康紀錄</b>　{date_label(event.get('occurredAt'))}　{clip(event.get('summary') or event.get('type'))}", body))
        if groups["dailyLogs"]:
            latest = groups["dailyLogs"][0]
            labels = {"low": "偏少", "normal": "正常", "high": "偏多", "slightly_low": "稍沒精神", "hard": "偏硬", "soft": "偏軟", "watery": "水狀"}
            fields = (("waterLevel", "喝水"), ("foodLevel", "飼料"), ("energyLevel", "精神"), ("stoolLevel", "便便"))
            states = "・".join(f"{label}{labels.get(latest.get(field), '未填寫')}" for field, label in fields)
            lines.append(Paragraph(f"<b>最近日常</b>　{date_label(latest.get('localDate'))}　{escape_text(states)}", body))
        if groups["medications"]:
            names = "、".join(str(item.get("name") or "未填寫") for item in groups["medications"][:2])
            extra = len(groups["medications"]) - 2
            lines.append(Paragraph(f"<b>近期用藥紀錄</b>　{clip(names)}" + (f"；另有 {extra} 項" if extra > 0 else ""), body))
        if groups["weights"]:
            latest = groups["weights"][0]
            text = f"{latest.get('weightKg')} kg（{date_label(latest.get('measuredAt'))}）"
            if len(groups["weights"]) > 1:
                delta = float(latest["weightKg"]) - float(groups["weights"][1]["weightKg"])
                text += ";與前次相同" if delta == 0 else f"；較前次{'增加' if delta > 0 else '減少'} {abs(delta):g} kg"
            lines.append(Paragraph(f"<b>最近體重</b>　{escape_text(text)}", body))
        if groups["medicalVisits"]:
            visit = groups["medicalVisits"][0]
            lines.append(Paragraph(f"<b>最近就醫</b>　{date_label(visit.get('visitedAt'))}　{clip(visit.get('reason'))}　{clip(visit.get('clinicName'), 42)}", body))
        if len(lines) == 2:
            lines.append(Paragraph("所選期間沒有健康異常、日常、用藥、體重或就醫紀錄。", body))
        return [Paragraph(clip(pet.get("name") or "毛孩", 40), pet_title), *lines]

    table = Table([[pet_card(pet)] for pet in data["pets"][:3]], colWidths=[164 * mm], style=TableStyle([
        ["BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFCF7")],
        ["BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8D4C2")],
        ["INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E8D4C2")],
        ["VALIGN", (0, 0), (-1, -1), "TOP"],
        ["LEFTPADDING", (0, 0), (-1, -1), 9], ["RIGHTPADDING", (0, 0), (-1, -1), 9],
        ["TOPPADDING", (0, 0), (-1, -1), 7], ["BOTTOMPADDING", (0, 0), (-1, -1), 7],
    ]))
    names = "、".join(str(pet.get("name") or "毛孩") for pet in data["pets"])
    story = [
        Paragraph("MEGO　｜　健康照護紀錄", body), Spacer(1, 4 * mm),
        Paragraph("看診快速摘要", title),
        Paragraph(f"毛孩：{clip(names, 70)}　　資料期間：{escape_text(report_period)}　　整理時間：{export_time}", body),
        Spacer(1, 4 * mm), KeepInFrame(164 * mm, 180 * mm, [table], mode="shrink"),
        Spacer(1, 4 * mm),
        Paragraph("本頁整理毛孩基本資料與近期照護重點。未填寫代表沒有登記；省略號表示內容較長，完整內容及日期請見後續明細。", body),
        Paragraph("內容依飼主紀錄整理，供看診溝通參考，不代表疾病診斷。", body),
    ]
    if len(data["pets"]) > 3:
        story.append(Paragraph(f"另有 {len(data['pets']) - 3} 隻毛孩的資料，請見後續明細。", body))
    return story
