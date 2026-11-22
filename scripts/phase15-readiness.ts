import {readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {calculateReleaseReadiness} from "../src/lib/ops/release-gates";

const source=process.env.PHASE14_MANIFEST_PATH??"artifacts/phase14-synthetic-acceptance.json";
const destination=process.env.PHASE15_OUTPUT_DIR??"artifacts";
const parsed=JSON.parse(await readFile(source,"utf8")) as unknown;
let operator:unknown={version:1,evidence:[]};
if(process.env.PHASE15_OPERATOR_EVIDENCE_PATH){
  operator=JSON.parse(await readFile(process.env.PHASE15_OPERATOR_EVIDENCE_PATH,"utf8")) as unknown;
}
const result=calculateReleaseReadiness(parsed,operator);
const summary={
  schemaVersion:1,phase:15,
  evaluatedAt:new Date().toISOString(),
  ...result,
  // An explicit status word is not permission to deploy.
  releaseAuthorized:false,
  evidenceSource:"synthetic_ci_and_unverified_operator_records",
};
await mkdir(destination,{recursive:true});
await writeFile(join(destination,"phase15-pilot-readiness.json"),
  JSON.stringify(summary,null,2)+"\n",{mode:0o600});
console.log("Phase 15 release readiness:",result.status,
  "syntheticPass:",result.syntheticCiPassed,
  "externalMissing:",result.missingGates.length,
  "productionApproved:",result.productionApproved);
if(!result.syntheticCiPassed)process.exitCode=1;
if(result.productionApproved||result.customerDataApproved||result.verifiedSavings)
  process.exitCode=1;
