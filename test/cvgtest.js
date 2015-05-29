var expect = require('chai').expect;
var cvg = require('../index.js');

describe('cvg example test', function () {
  it('can do tests', function(done) {
    var result = new cvg.expressions.Expression();
    expect(result.evaluate(10, 5, 0)).to.deep.equal(255);
    done();
  });
});