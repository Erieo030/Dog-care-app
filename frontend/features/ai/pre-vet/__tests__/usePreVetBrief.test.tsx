Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { usePreVetBrief } from '../usePreVetBrief';
import {
  getVetVisitBrief,
  type VetBriefSection,
  type VetVisitBrief,
} from '../../../../services/aiService';
import { brief } from './preVetFixture';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../services/aiService', () => ({ getVetVisitBrief: jest.fn() }));

const sections: VetBriefSection[] = ['health', 'weight'];
let current: ReturnType<typeof usePreVetBrief>;
let screen: ReactTestRenderer;
function Harness({
  days = 7,
  selected = sections,
}: {
  days?: number;
  selected?: VetBriefSection[];
}) {
  current = usePreVetBrief('user', 'pet', days, selected);
  return null;
}
function pending() {
  let resolve!: (value: VetVisitBrief) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<VetVisitBrief>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('changing period cancels an old AI request and ignores its late result', async () => {
  const oldAI = pending();
  const nextBrief = pending();
  (getVetVisitBrief as jest.Mock)
    .mockResolvedValueOnce(brief)
    .mockReturnValueOnce(oldAI.promise)
    .mockReturnValueOnce(nextBrief.promise);
  await act(async () => {
    screen = create(<Harness />);
  });
  await act(async () => {
    void current.enhanceWithAI();
  });
  const oldSignal = (getVetVisitBrief as jest.Mock).mock.calls[1][5] as AbortSignal;
  await act(async () => screen.update(<Harness days={15} />));
  expect(oldSignal.aborted).toBe(true);
  expect(current.brief).toBeNull();
  const updated = { ...brief, period: { ...brief.period, days: 15 }, aiNarrative: null };
  await act(async () => nextBrief.resolve(updated));
  await act(async () => oldAI.resolve(brief));
  expect(current.brief?.period.days).toBe(15);
  expect(current.brief?.aiNarrative).toBeNull();
  expect(current.narrativeLoading).toBe(false);
});

test('changing categories hides the previous summary while the new one loads', async () => {
  const next = pending();
  (getVetVisitBrief as jest.Mock).mockResolvedValueOnce(brief).mockReturnValueOnce(next.promise);
  await act(async () => {
    screen = create(<Harness />);
  });
  await act(async () => screen.update(<Harness selected={['daily']} />));
  expect(current.brief).toBeNull();
  expect(current.loading).toBe(true);
  expect((getVetVisitBrief as jest.Mock).mock.calls[1][4]).toEqual(['daily']);
});

test('failed AI generation preserves system records and blocks immediate duplicate requests', async () => {
  const ai = pending();
  (getVetVisitBrief as jest.Mock).mockResolvedValueOnce(brief).mockReturnValueOnce(ai.promise);
  await act(async () => {
    screen = create(<Harness />);
  });
  await act(async () => {
    void current.enhanceWithAI();
    void current.enhanceWithAI();
  });
  expect(getVetVisitBrief).toHaveBeenCalledTimes(2);
  await act(async () => ai.reject(new Error('AI 逾時')));
  expect(current.brief).toBe(brief);
  expect(current.narrativeError).toBe('AI 逾時');
  expect(current.narrativeLoading).toBe(false);
});
