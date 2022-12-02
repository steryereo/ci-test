function add(...args) {
  return args.reduce((total, arg) => total + arg, 0);
}

module.exports = { add };
