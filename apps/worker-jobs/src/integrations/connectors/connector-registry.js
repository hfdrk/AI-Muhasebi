"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectorRegistry = exports.ConnectorRegistry = void 0;
const mock_accounting_connector_1 = require("./mock-accounting-connector");
const mock_bank_connector_1 = require("./mock-bank-connector");
class ConnectorRegistry {
    accountingConnectors = new Map();
    bankConnectors = new Map();
    constructor() {
        this.registerAccountingConnector("MOCK_ACCOUNTING", new mock_accounting_connector_1.MockAccountingConnector());
        this.registerBankConnector("MOCK_BANK", new mock_bank_connector_1.MockBankConnector());
    }
    registerAccountingConnector(code, connector) {
        this.accountingConnectors.set(code, connector);
    }
    registerBankConnector(code, connector) {
        this.bankConnectors.set(code, connector);
    }
    getAccountingConnector(code) {
        return this.accountingConnectors.get(code) || null;
    }
    getBankConnector(code) {
        return this.bankConnectors.get(code) || null;
    }
    getConnector(code, type) {
        if (type === "accounting") {
            return this.getAccountingConnector(code);
        }
        else if (type === "bank") {
            return this.getBankConnector(code);
        }
        return null;
    }
}
exports.ConnectorRegistry = ConnectorRegistry;
exports.connectorRegistry = new ConnectorRegistry();
//# sourceMappingURL=connector-registry.js.map