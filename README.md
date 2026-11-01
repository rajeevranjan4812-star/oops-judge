# Code-Karo.dev - Java Practice Judge

41 coding problems from Practice-Test 1-15 (the MCQs are not included), each with a starter file, a README, and test cases.
Only a JDK (Java 11+) is needed. Python 3 is used for the small runner, but you can also use plain `javac`.


https://codekaro-two.vercel.app/
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frajeevranjan4812-star%2Foops-judge)

## How to use

### Browser app

Start the local web app from this folder:

```powershell
py app.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) for the landing page, [http://127.0.0.1:8000/practice](http://127.0.0.1:8000/practice) for the judge, or [http://127.0.0.1:8000/profile](http://127.0.0.1:8000/profile) for your profile and submission heatmap. In the judge, choose a problem, edit `Solution.java`, then select **Run tests** (or press `Ctrl+Enter`). **Save** writes your current solution to that problem's folder. Keep the terminal open while using the app; press `Ctrl+C` there to stop it. If port 8000 is already in use, choose another, for example `py app.py --port 8080`.

The app uses only Python's standard library and your local JDK. It listens on your computer only; submitted code is compiled and run locally.

### Command line

```bash
python3 judge.py list                  # all problem ids
python3 judge.py pyramid-4             # runs problems/pyramid-4/Solution.java against its tests
python3 judge.py all                   # run every problem
python3 judge.py exam-topper --ref     # run the reference solution (to see what ACCEPTED looks like)
```
Without Python:
```bash
mkdir -p out && javac -d out common/Judge.java problems/exam-topper/*.java && java -cp out Test
```

Each problem folder: `Solution.java` (edit this - starter code with the exact signature), `README.md` (statement + samples), `Test.java` (the judge cases).
Output looks like:
```
=== Exam Topper ===
[PASS] sample 1
[FAIL] all negative
       Expected: -5
       Actual  : 0
Result: 4/6 passed  ->  WRONG ANSWER
```
Verdicts: PASS, FAIL (wrong answer, with Expected/Actual), Runtime Error (with the line), Time Limit Exceeded (2 s per case), Compilation Error.
Printing problems compare output line by line and ignore trailing spaces / blank lines.

## Notes on the starters
* Classes are package-private (`class Main`, not `public class Main`) because the file is named `Solution.java`; paste your code into the platform and add `public` if it needs it.
* Several statements were only partly visible in the photos. Where a rule was cut off, the assumption is in the problem README and tests avoid ambiguous cases
  (e.g. ties for the longest word, duplicate marks for second-highest, `n >= 10` in the digit pyramids).

## Problems

| # | Id | Title | From |
|---|----|-------|------|
| 1 | `airline-ticket-concat` | The Airline Ticket - Concatenate two strings | Practice-Test 10 |
| 2 | `assignment44-analyze-sentence` | Assignment44 - Analyze Sentence | Practice-Test 13 |
| 3 | `class-box` | class - Box | Practice-Test 10 |
| 4 | `class-student` | Class Student | Practice-Test 8 |
| 5 | `cloud-server-health` | Cloud Server Health Monitoring | Practice-Test 11 |
| 6 | `college-seats-reserved` | College Seats Are Reserved | Practice-Test 14 |
| 7 | `compress-a-string` | Compress a string | Practice-Test 5 |
| 8 | `count-pos-neg-even-odd` | Count negative, positive, even and odd | Practice-Test 2 |
| 9 | `custom-exception-power` | Calculate positive power of a positive number | Practice-Test 15 |
| 10 | `daily-loss-counter` | The Daily Loss Counter | Practice-Test 5, 13 |
| 11 | `date-class` | Implement the Date class | Practice-Test 6 |
| 12 | `employee` | Employee | Practice-Test 7 |
| 13 | `exam-topper` | Exam Topper | Practice-Test 1, 12 |
| 14 | `find-the-longest-word` | Find the Longest Word | Practice-Test 7 |
| 15 | `layered-pyramid-3` | Layered Calibration Code Pyramid - 3 | Practice-Test 5 |
| 16 | `library-book-inventory` | Library Book Inventory Management | Practice-Test 15 |
| 17 | `lowercase-to-uppercase` | Convert lower case to upper case | Practice-Test 4 |
| 18 | `main-diagonal-sum` | Find sum of main diagonal of matrix | Practice-Test 9 |
| 19 | `matrix-multiplication` | Matrix Multiplication | Practice-Test 7 |
| 20 | `matrix-row-and-column-sum` | Sum of elements of matrix | Practice-Test 6 |
| 21 | `mycalculator-exception` | MyCalculator Exception | Practice-Test 12 |
| 22 | `perfect-string` | Perfect String | Practice-Test 8 |
| 23 | `pyramid-13` | Pyramid - 13 | Practice-Test 1 |
| 24 | `pyramid-4` | Pyramid - 4 | Practice-Test 2 |
| 25 | `pyramid-9` | Pyramid - 9 | Practice-Test 3 |
| 26 | `quality-check` | Quality Check (even / odd count) | Practice-Test 4, 11 |
| 27 | `save-bandwidth-compression` | Save Bandwidth Using Compression | Practice-Test 6 |
| 28 | `search-an-element` | Search an element | Practice-Test 3, 15 |
| 29 | `separate-even-odd` | Put even and odd elements in 2 separate arrays | Practice-Test 14 |
| 30 | `sequential-id-pyramid-7` | Sequential ID Pyramid - 7 | Practice-Test 4 |
| 31 | `stock-price-trend` | Stock Trading - Price Trend Analyzer | Practice-Test 13 |
| 32 | `strings-are-anagram` | Strings are anagram or not | Practice-Test 9 |
| 33 | `strong-virus` | Strong Virus Detection | Practice-Test 1 |
| 34 | `student-marks-get-element` | Student Marks Management System | Practice-Test 14 |
| 35 | `sum-lower-triangle` | Sum of Lower Triangle of a Square Matrix | Practice-Test 10 |
| 36 | `sum-of-kth-row` | Sum of Elements in the Kth Row of a Matrix | Practice-Test 8 |
| 37 | `translate-the-letter` | Translate The Letter | Practice-Test 2 |
| 38 | `tricycle-speed-manager` | Tricycle Speed Manager | Practice-Test 9 |
| 39 | `uppercase-to-lowercase` | Convert Uppercase String to Lowercase | Practice-Test 3 |
| 40 | `valid-email-address` | Valid email address | Practice-Test 11 |
| 41 | `web-browser-tab-history` | Web Browser Tab History Analyzer | Practice-Test 12 |
