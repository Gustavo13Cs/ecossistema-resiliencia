import {
  CLINICAL_MARKERS_DICTIONARY,
  evaluateMarkerValue,
} from './lab-marker-reference';
import {
  CLINICAL_MARKERS_DICTIONARY as browserDictionary,
  evaluateMarkerValue as browserEvaluate,
} from '../../../../web/types/lab-exam';
describe('Clinical filter references', () => {
  it('keeps server filtering and existing browser interpretation identical', () => {
    expect(CLINICAL_MARKERS_DICTIONARY).toEqual(browserDictionary);
    for (const [name, ref] of Object.entries(browserDictionary)) {
      for (const value of [
        0,
        10000,
        ...[ref.min, ref.max, ref.optimalMin, ref.optimalMax].flatMap(
          (bound) =>
            bound === undefined ? [] : [bound - 0.001, bound, bound + 0.001],
        ),
      ]) {
        expect(evaluateMarkerValue(name, value)).toBe(
          browserEvaluate(name, value),
        );
      }
    }
    expect(evaluateMarkerValue('Desconhecido', -1)).toBe('OPTIMAL');
  });
});
