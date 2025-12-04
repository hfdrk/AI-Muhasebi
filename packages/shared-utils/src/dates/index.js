"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateTurkish = formatDateTurkish;
exports.formatDateTimeTurkish = formatDateTimeTurkish;
exports.formatCurrencyTurkish = formatCurrencyTurkish;
function formatDateTurkish(date) {
    return new Intl.DateTimeFormat("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}
function formatDateTimeTurkish(date) {
    return new Intl.DateTimeFormat("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}
function formatCurrencyTurkish(amount) {
    return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
    }).format(amount);
}
//# sourceMappingURL=index.js.map