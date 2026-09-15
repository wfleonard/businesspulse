/** @jest-environment node */
import { csvCell, toCsv } from '../csv'

describe('csvCell', () => {
  it('leaves plain text, numbers and booleans alone', () => {
    expect(csvCell('East Coast Utility')).toBe('East Coast Utility')
    expect(csvCell(0.108)).toBe('0.108')
    expect(csvCell(-3)).toBe('-3')
    expect(csvCell(true)).toBe('true')
  })

  it('writes empty cells for null and undefined', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('East Coast Utility, LLC')).toBe('"East Coast Utility, LLC"')
    expect(csvCell('the "best" drillers')).toBe('"the ""best"" drillers"')
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"')
  })

  it('neutralizes text that a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil.example","click")')).toBe('"\'=HYPERLINK(""http://evil.example"",""click"")"')
    expect(csvCell('+1 555 0100')).toBe("'+1 555 0100")
    expect(csvCell('-2+3')).toBe("'-2+3")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('writes dates as ISO timestamps', () => {
    expect(csvCell(new Date('2026-09-15T18:21:25.770Z'))).toBe('2026-09-15T18:21:25.770Z')
  })
})

describe('toCsv', () => {
  it('joins a header and rows with CRLF line endings', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y'], [null, '=1']])).toBe('a,b\r\n1,"x,y"\r\n,\'=1\r\n')
  })
})
