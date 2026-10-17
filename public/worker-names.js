// Office aliases decorate generic provider labels; recorded names stay available.
const givenNames = ['Ada','Aiden','Amara','Arlo','Atlas','Ava','Beau','Blake','Briar','Callum','Cleo','Dara','Dax','Demi','Eden','Eli','Ellis','Ember','Esme','Ezra','Finn','Flora','Gia','Hana','Hugo','Inez','Iris','Isaac','Jade','Jasper','Jett','Jules','Kai','Kira','Leo','Lila','Luca','Lumi','Mae','Maya','Milo','Mina','Nadia','Nico','Noah','Nora','Nova','Omar','Opal','Orion','Otis','Pax','Piper','Quinn','Remy','Rey','Rio','Rory','Rowan','Ruby','Sage','Sam','Sana','Skye','Sloane','Sol','Talia','Theo','Uma','Vera','Wren','Yara','Zara','Zeke','Zoe','Zuri'];
const familyNames = ['Ash','Banks','Bell','Bloom','Brooks','Cedar','Chase','Chen','Cole','Cove','Cruz','Dale','Dawn','Dune','Ellis','Fern','Finch','Ford','Fox','Frost','Gray','Green','Hale','Hart','Hayes','Hill','Holt','Jade','Kim','Lake','Lane','Lee','Marsh','Moss','North','Oak','Park','Pike','Quill','Ray','Reed','Reyes','River','Rose','Rowe','Shaw','Snow','Stone','Vale','Voss','West','Wilde','Woods','Wren','York'];
const genericName = /^(?:codex|claude(?: code)?|copilot(?: cli)?|(?:codex|claude|copilot) subagent|subagent|agent|untitled)(?:[ _-]?\d+)?$/i;
const hashName = value => {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

export function nameWorkers(sessions = []) {
  return sessions.map(session => {
    const recordedName = session.recordedName || session.name || session.provider || 'Agent';
    if (!genericName.test(recordedName.trim()) || !session.id) return session;
    const chatName=typeof session.title==='string'?session.title.replace(/[\x00-\x1f]/g,' ').trim():'';
    if(chatName&&!/^(?:untitled(?:[- _]?\d+| session)?|(?:codex|claude|copilot) session)$/i.test(chatName)&&!/(?:AGENTS\.md|<INSTRUCTIONS>|environment_context)/i.test(chatName))return {...session,recordedName,name:chatName.slice(0,90)};
    const hash = hashName(`${session.provider || 'Agent'}:${session.id}`);
    const name = givenNames[hash % givenNames.length] + ' ' + familyNames[(hash >>> 16) % familyNames.length];
    return { ...session, recordedName, name };
  });
}
