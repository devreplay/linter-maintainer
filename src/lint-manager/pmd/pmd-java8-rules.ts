import { basename } from 'path';
import { rules as bestpractices } from './rules/bestpractices';
import { rules as codestyle } from './rules/codestyle';
import { rules as design } from './rules/design';
import { rules as documentation } from './rules/documentation';
import { rules as errorprone } from './rules/errorprone';
import { rules as multithreading } from './rules/multithreading';
import { rules as performance } from './rules/performance';
import { rules as security } from './rules/security';

export const allRules: string[] = [
    ...bestpractices,
    ...codestyle,
    ...design,
    ...documentation,
    ...errorprone,
    ...multithreading,
    ...performance,
    ...security];

export function makeFullRuleID(shortRuleid: string): string {
    let category = '';
    if (bestpractices.includes(shortRuleid)) {
        category = 'bestpractices';
    } else if (codestyle.includes(shortRuleid)) {
        category = 'codestyle';
    } else if (design.includes(shortRuleid)) {
        category = 'design';
    } else if (documentation.includes(shortRuleid)) {
        category = 'documentation';
    } else if (errorprone.includes(shortRuleid)) {
        category = 'errorprone';
    } else if (multithreading.includes(shortRuleid)) {
        category = 'multithreading';
    } else if (performance.includes(shortRuleid)) {
        category = 'performance';
    } else if (security.includes(shortRuleid)) {
        category = 'security';
    } else {
        return shortRuleid;
    }
    const output = `category/java/${category}.xml/${shortRuleid}`;
    return output;
}

export function makeShortRuleID(fullRuleid: string): string {
    return basename(fullRuleid);
}