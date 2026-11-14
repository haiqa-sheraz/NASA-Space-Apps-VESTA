# Data prep quality report

Generated 2026-11-14T14:05:47

- Studies: 24 (19 with tables)
- Table rows: 1859; counted as tests: 1807 (duplicates, planned and flow-visualization rows excluded)
- Citations file used: yes (24 PSI entries found)

## BASS (PSI-26)

- Tables: PSI-26_Experimental table_BASS.csv (122 rows, utf-8-sig)
- Tests counted: 122 of 122 rows
- Fix/note: Normalized sample names (for example 'pmma 2 cm' and 'PMMA 2 cm' are the same).
- Thin table: Table lists samples only (no airflow, oxygen or results). Use the reports.
- Flag (39 rows): material not stated in the table
- Flag (1 rows): stray character removed from date '6/29/`12'
- Flag (1 rows): year typo fixed: 2103 -> 2013 (matches GMT day 135)

## BASS-II (PSI-25)

- Tables: PSI-25_Experimental table_BASS-II.csv (129 rows, utf-8-sig)
- Tests counted: 129 of 129 rows
- Fix/note: Airflow is stored as fan and air display readings, not cm/s. Kept as-is and flagged.
- Flag (129 rows): airflow given as display readings, not cm/s (convert with the BASS-II Summary Report)
- Flag (1 rows): final O2 1.6% is far below initial 22.2%: check against the report
- Flag (1 rows): final O2 0.6% is far below initial 20.8%: check against the report
- Flag (1 rows): final O2 0.9% is far below initial 20.7%: check against the report

## SPICE (PSI-107)

- Tables: PSI-107_Experimental table_Spice.csv (469 rows, utf-8-sig)
- Tests counted: 435 of 469 rows
- Fix/note: Fuel spelling unified ('75 % Propylene' = '75% Propylene').
- Fix/note: Exact duplicate rows marked (duplicate_of) and not counted as separate tests.
- Fix/note: Smoke points are in the SPICE final report (Table 1), not in this table.
- Flag (469 rows): year not in the table (GMT day only)

## SLICE (PSI-106)

- Tables: PSI-106_Experimental table_Slice.csv (12 rows, utf-8-sig)
- Tests counted: 12 of 12 rows
- Thin table: Table lists test dates and fuels only. Use the reports.
- Flag (5 rows): notes were mixed into the date or fuel cell; split out

## FLEX (PSI-69)

- Tables: PSI-69_Experimental table_FLEX.csv (274 rows, cp1252)
- Tests counted: 274 of 274 rows
- Fix/note: Column names fixed: 'O' = O2, 'N' = N2, 'CO' = CO2 (not carbon monoxide), 'He' = helium.
- Fix/note: Burning rate unit fixed to mm²/s. File read as Windows-1252 text.
- Flag (1 rows): pressure recorded as 0 mmHg: treated as missing

## FLEX-2 (PSI-68)

- Tables: PSI-68_Experimental table_Flex2.csv (8 rows, utf-8-sig)
- Tests counted: 0 of 8 rows
- Thin table: Table is the planned test matrix, not results.
- Flag (8 rows): planned test matrix, not a result

## CFI (PSI-39)

- Tables: PSI-39_Experimental table_CFI.csv (87 rows, utf-8-sig)
- Tests counted: 87 of 87 rows
- Fix/note: Results (flame behavior) are in the report's figures, not in this table.

## ACME BRE (PSI-20)

- Tables: PSI-20_Experimental table_ACME BRE.csv (18 rows, utf-8-sig)
- Tests counted: 18 of 18 rows
- Fix/note: Each row is a test day; oxygen cells list several levels. Imitates burning solids with a gas burner.
- Flag (1 rows): spreadsheet error: '3400%' read as 34%
- Flag (1 rows): spreadsheet error: '2100%' read as 21%

## ACME CLD Flame (PSI-21)

- Tables: PSI-21_Experimental table_CLD Flame.csv (32 rows, utf-8-sig)
- Tests counted: 32 of 32 rows
- Fix/note: Fuel bottle names had spreadsheet auto-increment typos ('40% CH5' ... 'CH14'); fixed to CH4.
- Flag (2 rows): fixed spreadsheet auto-increment typo: '40% CH5' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH6' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH7' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH8' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH9' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH10' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH11' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH12' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH13' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '40% CH14' -> '40% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '100% CH5' -> '100% CH4'
- Flag (1 rows): fixed spreadsheet auto-increment typo: '100% CH6' -> '100% CH4'

## ACME E-FIELD Flames (PSI-22)

- Tables: PSI-22_Experimental table_ACME E-FIELD Flames.csv (32 rows, utf-8-sig)
- Tests counted: 32 of 32 rows
- Flag (11 rows): fuel bottle blank in the table; assumed same as the row above

## ACME s-Flame (PSI-23)

- Tables: PSI-23_Experimental table_ACME s-Flame.csv (18 rows, utf-8-sig)
- Tests counted: 18 of 18 rows
- Fix/note: Diluent names had auto-increment typos ('with N3' ... 'N6'); fixed to N2.
- Flag (18 rows): oxygen and pressure are approximate (~)
- Flag (7 rows): fixed spreadsheet auto-increment typo (N3, N4... -> N2)

## ACME Flame Design (PSI-10)

- Tables: PSI-10_Experimental table_Flame Design_Inverse Flame.csv (120 rows, utf-8-sig); PSI-10_Experimental table_Flame Design_Normal Flame.csv (207 rows, utf-8-sig)
- Tests counted: 327 of 327 rows
- Fix/note: Inverse flame table cleaned. Oxygen converted from mole fraction to percent.
- Fix/note: Normal flame table cleaned. Oxygen converted from mole fraction to percent.
- Flag (120 rows): inside-out flame: oxygen flows from the burner, not cabin air
- Flag (66 rows): ramped test: 6 columns have no single value
- Flag (3 rows): ramped test: 5 columns have no single value
- Flag (2 rows): marked 'LOW O2' in the table: oxygen and flow columns have no single value

## ACME CFI-G (PSI-159)

- Tables: PSI-159_Experimental table_CFI-G_Normal Flames.csv (179 rows, utf-8-sig)
- Tests counted: 179 of 179 rows
- Fix/note: Only normal flames are in this table; inside-out flames (up to 85% oxygen) are only in the report.
- Flag (179 rows): pressure is approximate (table says 'approx p')

## Saffire-I (PSI-98)

- Tables: PSI-98_Experimental table_SAFFIRE-1.csv (4 rows, utf-8-sig)
- Tests counted: 2 of 4 rows
- Table vs report: Burn time: table says 420 s for sample S1; NASA's 2018 Saffire talk (NTRS 20180005168) says 400 s.
- Flag (2 rows): flow visualization row, not a burn
- Flag (1 rows): oxygen is approximate (~)

## Saffire-II (PSI-99)

- Tables: PSI-99_Experimental table_SAFFIRE-2.csv (15 rows, utf-8-sig)
- Tests counted: 7 of 15 rows
- Fix/note: Column names fixed: '?-g' = microgravity (μg), 'Samle' = Sample. Units split from numbers ('20 cm/s' -> 20).
- Flag (7 rows): oxygen is approximate (~)
- Flag (6 rows): blank row in the table
- Flag (4 rows): burn time listed as 'Insignificant'
- Flag (2 rows): flow visualization row, not a burn

## Saffire-III (PSI-100)

- Tables: PSI-100_Experimental table_SAFFIRE-3.csv (2 rows, utf-8-sig)
- Tests counted: 2 of 2 rows
- Thin table: Table has 2 rows.
- Table vs report: Airflow: table says 30 cm/s; NASA's 2018 Saffire talk (NTRS 20180005168) says 25 cm/s.

## SAME (PSI-102)

- Tables: PSI-102_Experimental table_SAME.csv (8 rows, utf-8-sig)
- Tests counted: 20 of 20 rows
- Fix/note: Samples 5 to 8 said 'same conditions as 1-4'; expanded into one row per condition.
- Thin table: Table has 8 rows; samples 5 to 8 reuse the conditions of samples 1 to 4.
- Flag (4 rows): expanded from 'same conditions as 1-4' (uses sample 1's conditions)
- Flag (4 rows): expanded from 'same conditions as 1-4' (uses sample 2's conditions)
- Flag (4 rows): expanded from 'same conditions as 1-4' (uses sample 3's conditions)
- Flag (4 rows): expanded from 'same conditions as 1-4' (uses sample 4's conditions)

## SAME-R (PSI-101)

- Tables: PSI-101_Experimental table_SAME-R.csv (109 rows, utf-8-sig)
- Tests counted: 109 of 109 rows
- Flag (109 rows): date has no year in the table

## DAFT (PSI-47)

- Tables: PSI-47_Experimental table_DAFT.csv (2 rows, utf-8-sig)
- Tests counted: 2 of 2 rows
- Thin table: Table lists 2 test sessions only.

## PSI-60 (PSI-60)

- Tests counted: 0 of 0 rows

## PSI-62 (PSI-62)

- Tests counted: 0 of 0 rows

## PSI-115 (PSI-115)

- Tests counted: 0 of 0 rows

## PSI-117 (PSI-117)

- Tests counted: 0 of 0 rows

## PSI-142 (PSI-142)

- Tests counted: 0 of 0 rows
