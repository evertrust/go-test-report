/**
 * @typedef TestStatus
 * @property {string} TestName
 * @property {string} Package
 * @property {number} ElapsedTime
 * @property {Array.<string>} Output
 * @property {boolean} Passed
 * @property {boolean} Skipped
 */
class TestStatus {}

/**
 * @typedef TestGroupData
 * @type {object}
 * @property {string} FailureIndicator
 * @property {string} SkippedIndicator
 * @property {Array.<TestStatus>}
 */
class TestGroupData {}

/**
 * @typedef TestResults
 * @type {Array.<TestGroupData>}
 */
class TestResults extends Array {}

/**
 * @typedef SelectedItems
 * @property {HTMLElement|EventTarget} testResults
 * @property {String} selectedTestGroupColor
 */
class SelectedItems {}

/**
 * @typedef GoTestReportElements
 * @property {TestResults} data
 * @property {HTMLElement} testResultsElem
 * @property {HTMLElement} testGroupListElem
 * @property {HTMLInputElement} [searchInputElem]
 * @property {HTMLElement} [searchMetaElem]
 * @property {HTMLElement} [statusFilterElem]
 * @property {HTMLDataListElement} [suggestionsElem]
 */
class GoTestReportElements {}


/**
 * Main entry point for GoTestReport.
 * @param {GoTestReportElements} elements
 * @returns {{testResultsClickHandler: testResultsClickHandler}}
 * @constructor
 */
window.GoTestReport = function (elements) {
  const /**@type {SelectedItems}*/ selectedItems = {
    testResults: null,
    selectedTestGroupColor: null
  }

  function addEventData(event) {
    if (event.data == null) {
      event.data = {target: event.target}
    }
    return event
  }


  const goTestReport = {
    /**
     * Invoked when a user clicks on one of the test group div elements.
     * @param {HTMLElement} target The element associated with the test group.
     * @param {boolean} shiftKey If pressed, all of test detail associated to the test group is shown.
     * @param {TestResults} data
     * @param {SelectedItems} selectedItems
     * @param {function(target: Element, data: TestResults)} testGroupListHandler
     */
    testResultsClickHandler: function (target,
                                       shiftKey,
                                       data,
                                       selectedItems,
                                       testGroupListHandler) {

      if (target.classList.contains('testResultGroup') === false) {
        return
      }
      if (selectedItems.testResults != null) {
        let testResultsElement = /**@type {HTMLElement}*/ selectedItems.testResults
        testResultsElement.classList.remove("selected")
        testResultsElement.style.backgroundColor = selectedItems.selectedTestGroupColor
      }
      const testGroupId = /**@type {number}*/ target.id
      if ((target.id === undefined)
        || (data[testGroupId] === undefined)
        || (data[testGroupId]['TestResults'] === undefined)) {
        return
      }
      const testResults = /**@type {TestResults}*/ data[testGroupId]['TestResults']
      let testGroupList = /**@type {string}*/ ''
      selectedItems.selectedTestGroupColor = getComputedStyle(target).getPropertyValue('background-color')
      selectedItems.testResults = target
      target.classList.add("selected")
      for (let i = 0; i < testResults.length; i++) {
        const testResult = /**@type {TestGroupData}*/ testResults[i]
        const testPassed = /**@type {boolean}*/ testResult.Passed
        const testSkipped = /**@type {boolean}*/ testResult.Skipped
        const testPassedStatus = /**@type {string}*/ (testPassed) ? '' : (testSkipped ? 'skipped' : 'failed')
        const testId = /**@type {string}*/ target.attributes['id'].value
        testGroupList += `<div class="testGroupRow ${testPassedStatus}" data-groupid="${testId}" data-index="${i}">
        <span class="testStatus ${testPassedStatus}">${(testPassed) ? '&check' : (testSkipped ? '&dash' : '&cross')};</span>
        <span class="testTitle">${testResult.TestName}</span>
        <span class="testDuration"><span>${testResult.ElapsedTime}s </span>⏱</span>
      </div>`
      }
      const testGroupListElem = elements.testGroupListElem
      testGroupListElem.innerHTML = ''
      testGroupListElem.innerHTML = testGroupList

      if (shiftKey) {
        testGroupListElem.querySelectorAll('.testGroupRow')
                         .forEach((elem) => testGroupListHandler(elem, data))
      } else if (testResults.length === 1) {
        testGroupListHandler(testGroupListElem.querySelector('.testGroupRow'), data)
      }
    },

    /**
     *
     * @param {Element} target
     * @param {TestResults} data
     */
    testGroupListHandler: function (target, data) {
      const attribs = target['attributes']
      if (attribs.hasOwnProperty('data-groupid')) {
        const groupId = /**@type {number}*/ attribs['data-groupid'].value
        const testIndex = /**@type {number}*/ attribs['data-index'].value
        const testStatus = /**@type {TestStatus}*/ data[groupId]['TestResults'][testIndex]
        const testOutputDiv = /**@type {HTMLDivElement}*/ target.querySelector('div.testOutput')

        if (testOutputDiv == null) {
          const testOutputDiv = document.createElement('div')
          testOutputDiv.classList.add('testOutput')
          const consolePre = document.createElement('pre')
          consolePre.classList.add('console')
          const testDetailDiv = document.createElement('div')
          testDetailDiv.classList.add('testDetail')
          const packageNameDiv = document.createElement('div')
          packageNameDiv.classList.add('package')
          packageNameDiv.innerHTML = `<strong>Package:</strong> ${testStatus.Package}`
          const testFileNameDiv = document.createElement('div')
          testFileNameDiv.classList.add('filename')
          if (testStatus.TestFileName.trim() === "") {
            testFileNameDiv.innerHTML = `<strong>Filename:</strong> n/a &nbsp;&nbsp;`
          } else {
            testFileNameDiv.innerHTML = `<strong>Filename:</strong> ${testStatus.TestFileName} &nbsp;&nbsp;`
            testFileNameDiv.innerHTML += `<strong>Line:</strong> ${testStatus.TestFunctionDetail.Line} `
            testFileNameDiv.innerHTML += `<strong>Col:</strong> ${testStatus.TestFunctionDetail.Col}`
          }
          testDetailDiv.insertAdjacentElement('beforeend', packageNameDiv)
          testDetailDiv.insertAdjacentElement('beforeend', testFileNameDiv)
          testOutputDiv.insertAdjacentElement('afterbegin', consolePre)
          testOutputDiv.insertAdjacentElement('beforeend', testDetailDiv)
          target.insertAdjacentElement('beforeend', testOutputDiv)

          if (testStatus.Passed) {
            consolePre.classList.remove('skipped')
            consolePre.classList.remove('failed')
          } else if (testStatus.Skipped) {
            consolePre.classList.add('skipped')
            consolePre.classList.remove('failed')
          } else {
            consolePre.classList.remove('skipped')
            consolePre.classList.add('failed')
          }
          consolePre.textContent = testStatus.Output.join('')
        } else {
          testOutputDiv.remove()
        }
      }
    },

    /**
     * Filters tests by name/package and by status across all groups, and
     * renders matches into the test group list element so that the existing
     * click-to-expand behavior on rows keeps working.
     * @param {TestResults} data
     * @param {SelectedItems} selectedItems
     */
    applyFilter: function (data, selectedItems) {
      const rawQuery = elements.searchInputElem ? elements.searchInputElem.value : ''
      const query = (rawQuery || '').trim().toLowerCase()
      const statusFilter = (function () {
        if (!elements.statusFilterElem) return 'all'
        const active = elements.statusFilterElem.querySelector('.statusChip.active')
        return active ? active.getAttribute('data-status') : 'all'
      })()
      const testGroupListElem = elements.testGroupListElem

      if (query === '' && statusFilter === 'all') {
        testGroupListElem.innerHTML = ''
        if (elements.searchMetaElem) {
          elements.searchMetaElem.textContent = ''
        }
        return
      }

      // Clear any highlighted test group indicator since we're showing a
      // cross-group list of matches instead of a single group's tests.
      if (selectedItems.testResults != null) {
        const testResultsElement = /**@type {HTMLElement}*/ selectedItems.testResults
        testResultsElement.classList.remove('selected')
        testResultsElement.style.backgroundColor = selectedItems.selectedTestGroupColor
        selectedItems.testResults = null
        selectedItems.selectedTestGroupColor = null
      }

      let html = ''
      let matches = 0
      for (let g = 0; g < data.length; g++) {
        const group = data[g]
        if (!group || !group.TestResults) {
          continue
        }
        for (let i = 0; i < group.TestResults.length; i++) {
          const testResult = /**@type {TestStatus}*/ group.TestResults[i]
          const testPassed = /**@type {boolean}*/ testResult.Passed
          const testSkipped = /**@type {boolean}*/ testResult.Skipped
          const status = testPassed ? 'passed' : (testSkipped ? 'skipped' : 'failed')
          if (statusFilter !== 'all' && status !== statusFilter) {
            continue
          }
          if (query !== '') {
            const name = (testResult.TestName || '').toLowerCase()
            const pkg = (testResult.Package || '').toLowerCase()
            if (name.indexOf(query) === -1 && pkg.indexOf(query) === -1) {
              continue
            }
          }
          const testPassedStatus = /**@type {string}*/ (testPassed) ? '' : (testSkipped ? 'skipped' : 'failed')
          html += `<div class="testGroupRow ${testPassedStatus}" data-groupid="${g}" data-index="${i}">
        <span class="testStatus ${testPassedStatus}">${(testPassed) ? '&check' : (testSkipped ? '&dash' : '&cross')};</span>
        <span class="testTitle">${testResult.TestName}</span>
        <span class="testDuration"><span>${testResult.ElapsedTime}s </span>⏱</span>
      </div>`
          matches++
        }
      }

      if (matches === 0) {
        const label = query !== ''
          ? `No tests match &laquo;${rawQuery}&raquo;${statusFilter !== 'all' ? ` (status: ${statusFilter})` : ''}.`
          : `No ${statusFilter} tests.`
        html = `<div class="testGroupRow noResults">${label}</div>`
      }
      testGroupListElem.innerHTML = html

      if (elements.searchMetaElem) {
        elements.searchMetaElem.textContent = matches === 0
          ? '0 matches'
          : `${matches} match${matches === 1 ? '' : 'es'}`
      }
    }
  }

  //+------------------------+
  //|    setup DOM events    |
  //+------------------------+
  elements.testResultsElem
          .addEventListener('click', event =>
            goTestReport.testResultsClickHandler(/**@type {HTMLElement}*/ addEventData(event).data.target,
                                                 event.shiftKey,
                                                 elements.data,
                                                 selectedItems,
                                                 goTestReport.testGroupListHandler))

  elements.testGroupListElem
          .addEventListener('click', event =>
            goTestReport.testGroupListHandler(/**@type {Element}*/ event.target,
                                              elements.data))

  if (elements.searchInputElem) {
    elements.searchInputElem
            .addEventListener('input', () =>
              goTestReport.applyFilter(elements.data, selectedItems))
  }

  if (elements.statusFilterElem) {
    elements.statusFilterElem
            .addEventListener('click', event => {
              const target = /**@type {HTMLElement}*/ event.target
              if (!target || !target.classList || !target.classList.contains('statusChip')) {
                return
              }
              const chips = elements.statusFilterElem.querySelectorAll('.statusChip')
              chips.forEach(chip => chip.classList.remove('active'))
              target.classList.add('active')
              goTestReport.applyFilter(elements.data, selectedItems)
            })
  }

  // Populate the <datalist> used by the search input with unique test names
  // and packages so the browser surfaces native autocomplete suggestions.
  if (elements.suggestionsElem) {
    const suggestions = new Set()
    for (let g = 0; g < elements.data.length; g++) {
      const group = elements.data[g]
      if (!group || !group.TestResults) continue
      for (let i = 0; i < group.TestResults.length; i++) {
        const t = group.TestResults[i]
        if (t.TestName) suggestions.add(t.TestName)
        if (t.Package) suggestions.add(t.Package)
      }
    }
    const frag = document.createDocumentFragment()
    Array.from(suggestions).sort().forEach(value => {
      const option = document.createElement('option')
      option.value = value
      frag.appendChild(option)
    })
    elements.suggestionsElem.innerHTML = ''
    elements.suggestionsElem.appendChild(frag)
  }

  return goTestReport
}
