export const syntheticLabels=[
  "billing question","shipping status","refund request","technical issue","account access","spam/other",
] as const;
const examples=[
  ["billing question","Why does invoice {n} include a duplicate service fee?"],
  ["shipping status","Can you tell me when shipment {n} arrives at the depot?"],
  ["refund request","Order {n} was returned. I would like my refund."],
  ["technical issue","The dashboard crashes when I open tracking case {n}."],
  ["account access","I cannot log in to my account for reference {n}."],
  ["spam/other","WIN a special promo for case {n} — unrelated promotion."],
] as const;
export function demoTraces(count=500){
  return Array.from({length:count},(_,i)=>{
    const index=i%examples.length,[label,example]=examples[index];
    const body=example.replace("{n}",String(10000+i));
    return {
      externalTraceId:"northwind-demo-"+i, timestamp:new Date(Date.UTC(2026,9,1,0,i%60)).toISOString(),
      taskType:"support_ticket_classification",inputText:body,
      promptTemplate:"Classify each support ticket into one of six predefined labels.",
      modelProvider:"MOCK",modelName:"mock-premium",inputTokens:150+((i*7)%90),
      outputTokens:10+((i*3)%8),latencyMs:300+((i*13)%600),
      status:"success",errorMessage:null,outputText:label,expectedOutput:label,
      humanLabel:label,qualityScore:1,
      businessContextRefs:[],metadata:{synthetic:true,demo:"northwind",ticketNumber:10000+i},
    };
  });
}
