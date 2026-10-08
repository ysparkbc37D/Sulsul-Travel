/* 공개 기능 검토용 가상 여행. 개인 일정·예약·거래·일기를 포함하지 않는다. */
(function (root) {
  'use strict';
  const DEMO_ID = 'demo_taiwan_5d_v1';
  const locations = ['타이베이', '타이베이', '타이중', '타이중', '타이베이'];
  const titles = ['도착과 골목 산책', '도시의 문화와 휴식', '다음 도시로 이동', '공원과 작은 발견', '여행 정리와 출발'];
  const sessions = [
    [['14:00 - 14:30','tour','도착 후 다음 동선 확인'],['14:30 - 15:00','flight','숙소 방향으로 이동'],['15:00 - 15:30','lodging','숙소 체크인과 짐 정리'],['15:30 - 16:00','rest','잠시 쉬며 컨디션 확인'],['16:00 - 17:00','tour','주변 골목 산책'],['17:00 - 17:30','food','동네 카페에서 쉬기'],['17:30 - 18:30','food','첫날 저녁 식사'],['18:30 - 19:00','rest','사진과 오늘의 순간 정리']],
    [['09:00 - 09:30','food','가벼운 아침 식사'],['09:30 - 10:00','flight','문화 공간으로 이동'],['10:00 - 11:00','tour','전시 공간 둘러보기'],['11:00 - 11:30','rest','사진과 한 줄 메모'],['11:30 - 12:30','food','점심과 휴식'],['12:30 - 13:00','flight','다음 장소로 이동'],['13:00 - 14:00','tour','시장 골목 산책'],['14:00 - 14:30','rest','날씨에 맞춰 다음 일정 조정']],
    [['09:00 - 09:30','food','아침 식사와 짐 확인'],['09:30 - 10:00','lodging','체크아웃'],['10:00 - 10:30','flight','역으로 이동'],['10:30 - 11:30','flight','도시 사이 이동'],['11:30 - 12:00','rest','도착 후 주변 동선 확인'],['12:00 - 13:00','food','점심 식사'],['13:00 - 13:30','lodging','짐 맡기기'],['13:30 - 14:30','tour','새로운 동네 산책']],
    [['09:00 - 09:30','food','아침 식사'],['09:30 - 10:00','flight','공원으로 이동'],['10:00 - 11:00','tour','공원 산책'],['11:00 - 11:30','rest','사진과 생각 남기기'],['11:30 - 12:30','food','점심 식사'],['12:30 - 13:00','flight','실내 공간으로 이동'],['13:00 - 14:00','tour','취향에 맞는 전시 둘러보기'],['14:00 - 14:30','rest','동행과 내일 계획 조정']],
    [['09:00 - 09:30','food','아침 식사'],['09:30 - 10:00','lodging','체크아웃과 짐 확인'],['10:00 - 11:00','flight','다음 출발 도시로 이동'],['11:00 - 11:30','rest','여행 기록 돌아보기'],['11:30 - 12:30','food','마지막 점심'],['12:30 - 13:00','flight','출발 장소로 이동'],['13:00 - 13:30','tour','예약과 출발 안내 확인'],['13:30 - 14:00','rest','일정 확정과 기록 내보내기']]
  ];
  const days = sessions.map((rows, dayIndex) => ({
    id:`demo_day_${dayIndex+1}`, dayNum:dayIndex+1, date:`2030-04-0${dayIndex+1}`,
    city:locations[dayIndex], country:'대만', flag:'🇹🇼', title:titles[dayIndex],
    planBlockId:dayIndex<2?'demo_taipei':dayIndex<4?'demo_taichung':'demo_departure',
    spots:rows.map(([time,cat,title],spotIndex) => ({
      id:`demo_spot_${dayIndex+1}_${spotIndex+1}`, time,cat,title,
      desc:'기능 설명용 가상 일정입니다. 실제 장소·교통·예약에 맞춰 편집해 보세요.',
      tip:cat==='flight'?'이동 시간은 예시입니다. 실제 교통편에서 확인하세요.':'글·사진 기록, 완료와 AI 조정을 시험해 보세요.',
      completed:dayIndex===0&&spotIndex===0, fixed:false
    }))
  }));
  days[0].spots[0].recordId='demo_activity_1';
  const demoTrip = {
    id:DEMO_ID, title:'[가상 예제] 타이베이·타이중 5일 여행',
    subtitle:'일정 → 현장 기록 → 여행 이야기의 흐름을 살펴보세요. 날짜·시간·금액은 모두 가상입니다.',
    destination:'타이베이·타이중', countries:['대만'],cities:['타이베이','타이중'],
    startDate:'2030-04-01',endDate:'2030-04-05',durationDays:5,timeZone:'Asia/Taipei',
    currency:'TWD',budget:500000,style:'천천히 걷는 도시 여행',concepts:['문화','휴식','맛집'],
    coverEmoji:'🧭',isSample:true,demoTemplateId:DEMO_ID,demoVersion:1,revision:0,
    days,planBlockMeta:{
      demo_taipei:{title:'타이베이에서 시작',place:'타이베이',lodging:'가상 숙소 · 도시 중심',notes:'예제: 실내와 야외 일정을 날씨에 맞춰 조정',status:'draft'},
      demo_taichung:{title:'타이중의 다른 풍경',place:'타이중',lodging:'가상 숙소 · 역 인근',notes:'예제: 실제 이동편과 예약 시간을 먼저 확인',status:'draft'},
      demo_departure:{title:'기록과 출발',place:'타이베이',notes:'예제: 완료한 일정과 글을 여행 이야기로 모으기',status:'draft'}
    },
    expenses:[{id:'demo_expense_1',date:'2030-04-01',time:'17:00',title:'[가상 지출] 카페',amount:100,currency:'TWD',krw:4000,cat:'food',type:'expense',memo:'금액과 환산값은 기능 설명용 가상값입니다.'}],
    journals:{0:{text:'[가상 하루 회고] 골목을 걸으며 새 도시의 분위기를 느꼈다. 내 여행에서는 오늘 떠오른 생각을 여러 번 나누어 기록해 보자.',photos:[]}},
    momentEntries:[{id:'demo_moment_1',date:'2030-04-01',time:'16:20',dayIndex:0,text:'[가상 순간 기록] 잠시 멈춰 골목의 빛을 바라보았다.',photos:[],coverIndex:0,visibility:'private'}],
    activityRecords:{demo_activity_1:{id:'demo_activity_1',text:'[가상 일정 기록] 도착 후 동행과 오늘의 속도를 맞추었다.',photos:[],coverIndex:0,context:{spotId:'demo_spot_1_1',title:'도착 후 다음 동선 확인',date:'2030-04-01',time:'14:00'}}},
    checklist:[{id:'demo_check_1',text:'[예제] 예약 시간과 입장 안내 확인',checked:false},{id:'demo_check_2',text:'[예제] 동행과 이동·휴식 계획 합의',checked:false}],
    packingChecklist:[],exchangeRecords:[],appliedAiJobIds:[]
  };
  root.KB_TRAVEL={version:'1.9.0',demoTripId:DEMO_ID,templates:{demo_travel_5d:demoTrip},destinations:{},bookingGuides:[],defaultChecklist:[]};
})(typeof window!=='undefined'?window:globalThis);