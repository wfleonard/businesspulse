/** @jest-environment node */
import { measurementId } from '@/components/GoogleAnalytics'

describe('measurementId', () => {
  it('loads the default property in production', () => {
    expect(measurementId({ NODE_ENV: 'production' })).toBe('G-9LM5D025CR')
  })

  it('stays off outside production, so local runs are not counted', () => {
    expect(measurementId({ NODE_ENV: 'development' })).toBeNull()
    expect(measurementId({ NODE_ENV: 'test', GA_MEASUREMENT_ID: 'G-ABCDEF1234' })).toBeNull()
  })

  it('accepts an override', () => {
    expect(measurementId({ NODE_ENV: 'production', GA_MEASUREMENT_ID: ' G-ABCDEF1234 ' })).toBe('G-ABCDEF1234')
  })

  it('refuses anything that is not a GA4 ID, since it is written into an inline script', () => {
    for (const bad of ["G-1'); alert(1); ('", 'UA-12345-1', 'g-lowercase1', 'G-']) {
      expect(measurementId({ NODE_ENV: 'production', GA_MEASUREMENT_ID: bad })).toBeNull()
    }
  })
})
