import generatePermutations from './tests/RuleBasedPermuter';

const initial = [{
  selection: [],
  unselected: ['A:startProcess', 'B:startProcess', 'A:connectToProcess:B', 'B:connectToProcess:A',
    'B:createOutgoingPort', 'A:createIncomingPort', 'B:outConnectToIn', 'A:inConnectToOut',
    'B:sendMessage', 'A:receiveMessage'],
}];

const rules = [
  /* cannot do */       /* before */
  ['A:connectToProcess:B', 'A:startProcess'],
  ['B:connectToProcess:A', 'B:startProcess'],
  ['A:createIncomingPort', 'A:startProcess'],
  ['B:createOutgoingPort', 'B:startProcess'],
  ['B:outConnectToIn', 'B:createOutgoingPort'],
  ['A:inConnectToOut', 'A:createIncomingPort'],
  ['A:inConnectToOut', 'B:outConnectToIn'],
  ['A:receiveMessage', 'A:createIncomingPort'],
  ['B:sendMessage', 'B:createOutgoingPort'],

].map(rule => (val, currentlySelected) => val !== rule[0] || currentlySelected.includes(rule[1]));

console.log('Results');
const permutations = generatePermutations(initial, rules);
permutations.forEach(result => console.log(result.selection));
console.log(`Total: ${permutations.length} results`);
console.log(permutations);

