import { RuleMap, makeCommonRules, makeAMinusBRules } from '../src/lint-manager/rule-map';

const rule: RuleMap = new RuleMap(
    ['followed and enabled', 'unfollowed but enabled', 'unfollowed and disabled', 'followed but disabled'],
    ['unfollowed and disabled', 'unfollowed but enabled'],
    ['followed and enabled', 'unfollowed but enabled']);

test('Get followed and enabled', () => {
    expect(rule.getTruePositive()).toStrictEqual(['followed and enabled']);
});

test('Get unfollowed but enabled', () => {
    expect(rule.getFalsePositive()).toStrictEqual(['unfollowed but enabled']);
});

test('Get unfollowed and disabled', () => {
    expect(rule.getTrueNegative()).toStrictEqual(['unfollowed and disabled']);
});

test('Get followed but disabled', () => {
    expect(rule.getFalseNegative()).toStrictEqual(['followed but disabled']);
});

test('test common rules', () => {
    expect(makeCommonRules(['A', 'B', 'C'], ['A', 'C', 'D'])).toStrictEqual(['A', 'C']);
});

test('test uncommon rules', () => {
    expect(makeAMinusBRules(['A', 'B', 'C'], ['A', 'C', 'D'])).toStrictEqual(['B']);
    expect(makeAMinusBRules(['A', 'C', 'D'], ['A', 'B', 'C'])).toStrictEqual(['D']);
});