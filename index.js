function add(...args) {
  return args.reduce((total, arg) => total + arg, 0);
}

function multiply(...args) {
  return args.reduce((total, arg) => total * arg, 1);
}

function sayHi() {
  return "Hi";
}

module.exports = { add, multiply, sayHi };
