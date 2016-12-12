function permute(currentState, ruleSet) {
  let more = true;
  const newState = currentState.reduce((state, possibleOutcome) => {
    const selection = possibleOutcome.selection;
    const unselected = possibleOutcome.unselected;

    more = more && unselected.length > 0;

    unselected.forEach((val) => {
      const valid = ruleSet.every(rule => rule(val, selection));

      if (valid) {
        const newUnselected = unselected.slice();
        newUnselected.splice(newUnselected.indexOf(val), 1);
        state.push({
          selection: selection.concat(val),
          unselected: newUnselected,
        });
      }
    });
    return state;
  }, []);

  if (more) {
    return permute(newState, ruleSet);
  }
  return currentState;
}

export default function (items, rules) {
  return permute([{ selection: [], unselected: items.slice() }], rules);
}
