import type {MetricExample} from "./scoring";

export function wilson95(successes:number,total:number){
  if(!Number.isInteger(successes)||!Number.isInteger(total)||total<0||
    successes<0||successes>total)throw Error("Invalid binomial sample");
  if(total===0)return {lower:0,upper:1};
  const z=1.959963984540054,z2=z*z,p=successes/total;
  const den=1+z2/total;
  const center=(p+z2/(2*total))/den;
  const width=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/den;
  return {lower:Math.max(0,center-width),upper:Math.min(1,center+width)};
}
export function percentile(values:number[],fraction:number):number|null{
  if(!values.length)return null;
  if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw Error("Invalid percentile");
  const valid=values.filter(n=>Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);
  if(!valid.length)return null;
  return valid[Math.max(0,Math.ceil(fraction*valid.length)-1)];
}
export function costPerSuccessfulTask(cost:number,correct:number):number|null{
  if(!Number.isFinite(cost)||cost<0||!Number.isInteger(correct)||correct<0)
    throw Error("Invalid cost-per-success calculation");
  return correct===0?null:cost/correct;
}
export function perLabelMetrics(data:MetricExample[]){
  const known=[...new Set(data.map(row=>row.expected.trim().toLowerCase()).filter(Boolean))].sort();
  return known.map(label=>{
    const tp=data.filter(d=>d.expected.trim().toLowerCase()===label&&
      d.actual.trim().toLowerCase()===label&&d.valid).length;
    const fp=data.filter(d=>d.expected.trim().toLowerCase()!==label&&
      d.actual.trim().toLowerCase()===label).length;
    const fn=data.filter(d=>d.expected.trim().toLowerCase()===label&&!d.valid).length;
    const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;
    return {label,support:tp+fn,precision,recall,
      f1:precision+recall?2*precision*recall/(precision+recall):0,
      accuracyLower95:wilson95(tp,tp+fn).lower,
    };
  });
}
