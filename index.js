function add(...args) {
  return args.reduce((total, arg) => total + arg, 0);
}

function multiply(...args) {
  return args.reduce((total, arg) => total * arg, 1);
}

module.exports = { add, multiply };
