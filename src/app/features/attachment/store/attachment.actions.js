"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AttachmentActionTypes;
(function (AttachmentActionTypes) {
    AttachmentActionTypes["LoadAttachmentState"] = "[Attachment] Load Attachment State";
    AttachmentActionTypes["AddAttachment"] = "[Attachment] Add Attachment";
    AttachmentActionTypes["UpdateAttachment"] = "[Attachment] Update Attachment";
    AttachmentActionTypes["DeleteAttachment"] = "[Attachment] Delete Attachment";
    AttachmentActionTypes["DeleteAttachments"] = "[Attachment] Delete Attachments";
})(AttachmentActionTypes = exports.AttachmentActionTypes || (exports.AttachmentActionTypes = {}));
var LoadAttachmentState = /** @class */ (function () {
    function LoadAttachmentState(payload) {
        this.payload = payload;
        this.type = AttachmentActionTypes.LoadAttachmentState;
    }
    return LoadAttachmentState;
}());
exports.LoadAttachmentState = LoadAttachmentState;
var AddAttachment = /** @class */ (function () {
    function AddAttachment(payload) {
        this.payload = payload;
        this.type = AttachmentActionTypes.AddAttachment;
    }
    return AddAttachment;
}());
exports.AddAttachment = AddAttachment;
var UpdateAttachment = /** @class */ (function () {
    function UpdateAttachment(payload) {
        this.payload = payload;
        this.type = AttachmentActionTypes.UpdateAttachment;
    }
    return UpdateAttachment;
}());
exports.UpdateAttachment = UpdateAttachment;
var DeleteAttachment = /** @class */ (function () {
    function DeleteAttachment(payload) {
        this.payload = payload;
        this.type = AttachmentActionTypes.DeleteAttachment;
    }
    return DeleteAttachment;
}());
exports.DeleteAttachment = DeleteAttachment;
var DeleteAttachments = /** @class */ (function () {
    function DeleteAttachments(payload) {
        this.payload = payload;
        this.type = AttachmentActionTypes.DeleteAttachments;
    }
    return DeleteAttachments;
}());
exports.DeleteAttachments = DeleteAttachments;
//# sourceMappingURL=attachment.actions.js.map