/** 用途：讀取具 ownership、類型篩選與分頁的毛孩統一時間軸。 */
import { apiRequest } from './api';
import { TimelinePage, TimelineType } from '../types';
export const getTimelinePage = async (userId:string,petId:string,options:{limit?:number;skip?:number;type?:TimelineType}={}):Promise<TimelinePage> => {
  const query=new URLSearchParams({userId,limit:String(options.limit??20),skip:String(options.skip??0)});
  if(options.type)query.set('type',options.type);
  return apiRequest<TimelinePage>(`/api/pets/${petId}/timeline?${query.toString()}`);
};
export const getRecentTimeline = async (userId:string,petId:string,limit=5) =>
  (await getTimelinePage(userId,petId,{limit,skip:0})).items;
