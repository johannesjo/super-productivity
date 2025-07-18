import { NBrowser } from '../n-browser-interface';

module.exports = {
  command(
    this: NBrowser,
    config: {
      baseUrl: string;
      username: string;
      password: string;
      syncFolderPath: string;
    },
  ) {
    // CSS‑Selektoren zentral definieren
    const sel = {
      syncBtn: 'button.sync-btn',
      providerSelect: 'formly-field-mat-select mat-select',
      providerOptionWebDAV: '#mat-option-3', // Eintrag „WebDAV“
      baseUrlInput: '.e2e-baseUrl input',
      userNameInput: '.e2e-userName input',
      passwordInput: '.e2e-password input',
      syncFolder: '.e2e-syncFolderPath input',
      saveBtn: 'mat-dialog-actions button[mat-stroked-button]',
    };

    return this.click(sel.syncBtn)
      .waitForElementVisible(sel.providerSelect)
      .pause(100)
      .click(sel.providerSelect)
      .click(sel.providerOptionWebDAV)
      .pause(100)

      .setValue(sel.baseUrlInput, 'http://localhost:2345')
      .setValue(sel.userNameInput, 'admin')
      .setValue(sel.passwordInput, 'admin')
      .setValue(sel.syncFolder, '/')
      .pause(100)

      .click(sel.saveBtn);
  },
};
