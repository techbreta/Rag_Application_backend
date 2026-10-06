import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockRequest = jest.fn<(opts: unknown) => Promise<unknown>>();
const mockUpdateOne = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({ request: mockRequest })),
}));
jest.mock('./indexing.model', () => ({ __esModule: true, default: { updateOne: mockUpdateOne } }));
jest.mock('../../config/config', () => ({
  __esModule: true,
  default: { googleIndexing: { keyFile: 'key.json' } },
}));
jest.mock('../logger/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line import/first
import { publishUrlNotification, isPublicUrl } from './indexing.service';

const url = 'https://www.ragai.website/blog/some-post';

describe('indexing service', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockUpdateOne.mockReset();
    mockUpdateOne.mockResolvedValue({});
  });

  test('publishes the notification and records success', async () => {
    mockRequest.mockResolvedValue({ status: 200 });

    const result = await publishUrlNotification(url, 'URL_UPDATED');

    expect(result).toEqual({ success: true });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', data: { url, type: 'URL_UPDATED' } })
    );
    const [filter, update] = mockUpdateOne.mock.calls[0] as [unknown, any];
    expect(filter).toEqual({ url });
    expect(update.$set.status).toBe('success');
    expect(update.$unset).toEqual({ lastError: 1 });
  });

  test('returns the HTTP status and records failure when Google rejects', async () => {
    mockRequest.mockRejectedValue({ message: 'fail', response: { status: 429, data: { error: { message: 'Quota exceeded' } } } });

    const result = await publishUrlNotification(url, 'URL_DELETED');

    expect(result).toEqual({ success: false, httpStatus: 429, error: 'Quota exceeded' });
    const [, update] = mockUpdateOne.mock.calls[0] as [unknown, any];
    expect(update.$set).toEqual(expect.objectContaining({ type: 'URL_DELETED', status: 'failed', lastError: 'Quota exceeded' }));
  });

  test('does not throw when recording the submission fails', async () => {
    mockRequest.mockResolvedValue({ status: 200 });
    mockUpdateOne.mockRejectedValue(new Error('db down'));

    await expect(publishUrlNotification(url)).resolves.toEqual({ success: true });
  });

  test('skips non-public URLs without calling Google', async () => {
    const result = await publishUrlNotification('http://localhost:3000/blog/x');

    expect(result.success).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test('isPublicUrl accepts only public https URLs', () => {
    expect(isPublicUrl('https://www.ragai.website/')).toBe(true);
    expect(isPublicUrl('http://www.ragai.website/')).toBe(false);
    expect(isPublicUrl('https://localhost/')).toBe(false);
    expect(isPublicUrl('not a url')).toBe(false);
  });
});
