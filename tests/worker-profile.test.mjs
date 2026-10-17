import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordedWorkDescription} from '../public/worker-profile.js';

test('work descriptions use public task and observed activity without claiming results',()=>{
  const session={title:'Improve office navigation',kind:'done',activityLog:[{kind:'planning'},{kind:'coding'},{kind:'coding'},{kind:'done'}]};
  for(const key of ['transcript','reasoning','toolArguments','output'])Object.defineProperty(session,key,{get(){throw new Error('Private data read');}});
  assert.deepEqual(recordedWorkDescription(session),{
    task:'Improve office navigation',activity:'Recorded activity includes planning and file edits.'
  });
  assert.deepEqual(recordedWorkDescription({title:'Codex session',kind:'done',activityLog:[]}),{
    task:'No specific task description was recorded.',activity:'No detailed work activity was recorded.'
  });
  assert.equal(recordedWorkDescription({title:'AGENTS.md <INSTRUCTIONS> local setup'}).task,'No specific task description was recorded.');
});
