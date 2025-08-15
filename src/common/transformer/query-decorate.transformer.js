"use strict";
exports.__esModule = true;
exports.ToBoolean = exports.ToArray = void 0;
var class_transformer_1 = require("class-transformer");
function ToArray() {
    return (0, class_transformer_1.Transform)(function (_a) {
        var value = _a.value;
        if (undefined == value) {
            return undefined;
        }
        else if (!Array.isArray(value)) {
            return [value];
        }
        return value;
    });
}
exports.ToArray = ToArray;
function ToBoolean() {
    return (0, class_transformer_1.Transform)(function (_a) {
        var value = _a.value;
        if (value) {
            if (value == 'true') {
                return true;
            }
            else if (value == 'false') {
                return false;
            }
        }
        else {
            return undefined;
        }
        return value;
    });
}
exports.ToBoolean = ToBoolean;
