from datetime import datetime

from app.schemas.lost_pet import LostPetProfileRequest
from app.services import lost_pet_service
from app.timezone import TAIPEI


def test_public_contact_requires_one_enabled_and_filled_channel():
    no_contact = LostPetProfileRequest(contactName="", contactPhone="")
    assert not lost_pet_service.has_public_contact(no_contact)

    hidden_phone = LostPetProfileRequest(contactName="", contactPhone="0912-345-678", showContactPhone=False)
    assert not lost_pet_service.has_public_contact(hidden_phone)

    public_email = LostPetProfileRequest(
        contactName="", contactPhone="", contactEmail="owner@example.com", showContactEmail=True
    )
    assert lost_pet_service.has_public_contact(public_email)

    public_alternate_phone = LostPetProfileRequest(
        contactName="", contactPhone="", alternatePhone="0987-654-321", showAlternatePhone=True
    )
    assert lost_pet_service.has_public_contact(public_alternate_phone)


def test_public_page_uses_safe_clickable_contact_and_localized_pet_details(monkeypatch):
    monkeypatch.setattr(
        lost_pet_service,
        "public",
        lambda _token: {
            "name": "Kuro <script>",
            "sex": "male",
            "isNeutered": False,
            "contactName": "Erie",
            "contactPhone": "+886 912-345-678",
            "contactEmail": "owner@example.com",
            "updatedAt": datetime(2026, 9, 28, 9, 30, tzinfo=TAIPEI),
            "lostMode": False,
        },
    )

    html = lost_pet_service.public_html("test-token")

    assert "Kuro &lt;script&gt;" in html
    assert "性別</span><strong>公</strong>" in html
    assert "結紮狀態</span><strong>未結紮</strong>" in html
    assert 'href="tel:+886912345678"' in html
    assert 'href="mailto:owner@example.com"' in html
    assert "資料更新於 2026/09/28 09:30" in html
    assert "最後更新時間會隨 App 同步" not in html
