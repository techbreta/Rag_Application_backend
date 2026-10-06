"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockRequest = globals_1.jest.fn();
const mockUpdateOne = globals_1.jest.fn();
globals_1.jest.mock('google-auth-library', () => ({
    GoogleAuth: globals_1.jest.fn().mockImplementation(() => ({ request: mockRequest })),
}));
globals_1.jest.mock('./indexing.model', () => ({ __esModule: true, default: { updateOne: mockUpdateOne } }));
globals_1.jest.mock('../../config/config', () => ({
    __esModule: true,
    default: { googleIndexing: { keyFile: 'key.json' } },
}));
globals_1.jest.mock('../logger/logger', () => ({ __esModule: true, default: { info: globals_1.jest.fn(), warn: globals_1.jest.fn(), error: globals_1.jest.fn() } }));
// eslint-disable-next-line import/first
const indexing_service_1 = require("./indexing.service");
const url = 'https://www.ragai.website/blog/some-post';
(0, globals_1.describe)('indexing service', () => {
    (0, globals_1.beforeEach)(() => {
        mockRequest.mockReset();
        mockUpdateOne.mockReset();
        mockUpdateOne.mockResolvedValue({});
    });
    (0, globals_1.test)('publishes the notification and records success', async () => {
        mockRequest.mockResolvedValue({ status: 200 });
        const result = await (0, indexing_service_1.publishUrlNotification)(url, 'URL_UPDATED');
        (0, globals_1.expect)(result).toEqual({ success: true });
        (0, globals_1.expect)(mockRequest).toHaveBeenCalledWith(globals_1.expect.objectContaining({ method: 'POST', data: { url, type: 'URL_UPDATED' } }));
        const [filter, update] = mockUpdateOne.mock.calls[0];
        (0, globals_1.expect)(filter).toEqual({ url });
        (0, globals_1.expect)(update.$set.status).toBe('success');
        (0, globals_1.expect)(update.$unset).toEqual({ lastError: 1 });
    });
    (0, globals_1.test)('returns the HTTP status and records failure when Google rejects', async () => {
        mockRequest.mockRejectedValue({ message: 'fail', response: { status: 429, data: { error: { message: 'Quota exceeded' } } } });
        const result = await (0, indexing_service_1.publishUrlNotification)(url, 'URL_DELETED');
        (0, globals_1.expect)(result).toEqual({ success: false, httpStatus: 429, error: 'Quota exceeded' });
        const [, update] = mockUpdateOne.mock.calls[0];
        (0, globals_1.expect)(update.$set).toEqual(globals_1.expect.objectContaining({ type: 'URL_DELETED', status: 'failed', lastError: 'Quota exceeded' }));
    });
    (0, globals_1.test)('does not throw when recording the submission fails', async () => {
        mockRequest.mockResolvedValue({ status: 200 });
        mockUpdateOne.mockRejectedValue(new Error('db down'));
        await (0, globals_1.expect)((0, indexing_service_1.publishUrlNotification)(url)).resolves.toEqual({ success: true });
    });
    (0, globals_1.test)('skips non-public URLs without calling Google', async () => {
        const result = await (0, indexing_service_1.publishUrlNotification)('http://localhost:3000/blog/x');
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(mockRequest).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockUpdateOne).not.toHaveBeenCalled();
    });
    (0, globals_1.test)('isPublicUrl accepts only public https URLs', () => {
        (0, globals_1.expect)((0, indexing_service_1.isPublicUrl)('https://www.ragai.website/')).toBe(true);
        (0, globals_1.expect)((0, indexing_service_1.isPublicUrl)('http://www.ragai.website/')).toBe(false);
        (0, globals_1.expect)((0, indexing_service_1.isPublicUrl)('https://localhost/')).toBe(false);
        (0, globals_1.expect)((0, indexing_service_1.isPublicUrl)('not a url')).toBe(false);
    });
});
