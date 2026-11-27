// Run against a running DEVELOPMENT API. Creates and removes an isolated test project.
import assert from 'node:assert/strict';
const base = process.env.FLOWBOARD_API || 'http://localhost:5000';
let token, project;
async function call(path, method='GET', body, expected=200, auth=token) {
  const r = await fetch(`${base}${path}`, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data = await r.json();
  assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
try {
  await call('/api/health');
  const login = await call('/api/auth/login','POST',{email:'demo-manager@flowboard.example',password:'FlowBoard123!'});
  token=login.token;
  project=(await call('/api/projects','POST',{name:`Smoke test ${Date.now()}`},201)).project;
  await call(`/api/projects/${project._id}/members`,'POST',{email:'priya@flowboard.example'});
  const member=(await call('/api/auth/login','POST',{email:'priya@flowboard.example',password:'FlowBoard123!'})).token;
  await call(`/api/projects/${project._id}/analytics`,'GET',null,200,member);
  for(let i=0;i<4;i++)await call(`/api/tasks/project/${project._id}`,'POST',{title:`In progress ${i}`,status:'in-progress'},201);
  const task=(await call(`/api/tasks/project/${project._id}`,'POST',{title:'Blocked task'},201)).task;
  await call(`/api/tasks/${task._id}/move`,'PATCH',{status:'in-progress'},400);
  const edited=(await call(`/api/tasks/${task._id}`,'PATCH',{title:'Edited',assignee:login.user._id,priority:'high'})).task;
  assert.equal(edited.title,'Edited'); assert.equal(edited.assignee._id,login.user._id);
  const checked=(await call(`/api/tasks/${task._id}/checklist`,'POST',{text:'Check me'})).task;
  await call(`/api/tasks/${task._id}/checklist/${checked.checklist[0]._id}`,'PATCH',{done:true});
  await call(`/api/tasks/${task._id}/comments`,'POST',{text:'Smoke test comment'});
  await call(`/api/tasks/${task._id}/move`,'PATCH',{status:'done'});
  const analytics=await call(`/api/projects/${project._id}/analytics`);
  assert.equal(analytics.total,5);assert.equal(analytics.completion,20);
  await call(`/api/tasks/${task._id}`,'DELETE');
  console.log('PASS: auth, project membership, WIP rejection, task edit, checklist, comments, move, analytics, delete');
} finally {if(project)await call(`/api/projects/${project._id}`,'DELETE');}
