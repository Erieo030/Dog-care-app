/** 用途：顯示 Dashboard 期間體重折線，不依賴完整 chart framework。 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { DashboardWeightPoint } from '../../types';

export default function WeightTrendChart({ items }: { items: DashboardWeightPoint[] }) {
  const points = useMemo(() => [...items].sort((a,b)=>new Date(a.measuredAt).getTime()-new Date(b.measuredAt).getTime()), [items]);
  if (!points.length) return <Text style={s.empty}>此期間尚無體重資料</Text>;
  if (points.length === 1) return <Text style={s.empty}>至少需要兩筆資料才能顯示趨勢</Text>;
  const width=310,height=155,left=38,right=10,top=12,bottom=28;
  const values=points.map(x=>x.weightKg), rawMin=Math.min(...values), rawMax=Math.max(...values);
  const padding=rawMax===rawMin?Math.max(rawMax*.05,.5):(rawMax-rawMin)*.15;
  const min=Math.max(0,rawMin-padding),max=rawMax+padding;
  const coords=points.map((item,index)=>({item,x:left+index/(points.length-1)*(width-left-right),y:top+(max-item.weightKg)/(max-min||1)*(height-top-bottom)}));
  return <View style={s.wrap}><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
    <Line x1={left} y1={top} x2={left} y2={height-bottom} stroke={Colors.border}/><Line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke={Colors.border}/>
    <SvgText x={2} y={top+5} fontSize="10" fill={Colors.subtext}>{max.toFixed(1)}</SvgText><SvgText x={2} y={height-bottom+4} fontSize="10" fill={Colors.subtext}>{min.toFixed(1)}</SvgText>
    <Polyline points={coords.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={Colors.primary} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
    {coords.map((p,i)=><Circle key={p.item.id} cx={p.x} cy={p.y} r="4" fill={Colors.primary}/>) }
    <SvgText x={left} y={height-6} fontSize="10" fill={Colors.subtext}>{new Date(points[0].measuredAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})}</SvgText>
    <SvgText x={width-right} y={height-6} textAnchor="end" fontSize="10" fill={Colors.subtext}>{new Date(points[points.length-1].measuredAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})}</SvgText>
  </Svg></View>;
}
const s=StyleSheet.create({wrap:{width:'100%',overflow:'hidden'},empty:{color:Colors.subtext,textAlign:'center',paddingVertical:28}});
