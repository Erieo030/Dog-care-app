/** 用途：封裝後端全域搜尋、篩選、排序與分頁。 */
import {apiRequest} from './api';
import {SearchFilters,SearchPage} from '../types';
export async function searchRecords(userId:string,petId:string,filters:SearchFilters,page=1,pageSize=20){
 const query=new URLSearchParams({userId,timezoneOffsetMinutes:String(new Date().getTimezoneOffset()),query:filters.query,types:filters.types.join(','),healthCategories:filters.healthCategories.join(','),clinic:filters.clinic,veterinarian:filters.veterinarian,attachment:filters.attachment,reminderStatus:filters.reminderStatus,sort:filters.sort,page:String(page),pageSize:String(pageSize)});
 if(filters.startAt)query.set('startAt',filters.startAt);if(filters.endAt)query.set('endAt',filters.endAt);if(filters.minWeight!=null)query.set('minWeight',String(filters.minWeight));if(filters.maxWeight!=null)query.set('maxWeight',String(filters.maxWeight));
 return (await apiRequest<{success:boolean;message:string;data:SearchPage}>(`/api/pets/${petId}/search?${query.toString()}`,{},15000)).data;
}
