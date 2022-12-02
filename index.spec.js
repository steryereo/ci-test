const { add } = require("./index")

describe("add", () => {
  it("adds the args", () => {
    expect(add(1, 2, 3, 4, 5)).toEqual(1 + 2 + 3 + 4 + 5);
  });
});
