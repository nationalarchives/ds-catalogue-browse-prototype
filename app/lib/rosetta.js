const SEARCH_API_URL = process.env.ROSETTA_API_URL
  || 'https://rosetta-staging.k-int.com/rosetta/data/search'

const DEPARTMENTS_QUERY = 'size=1000&aggs=longSubject&filter=level:Lettercode;group:tna'

function toArray (value) {
  if (Array.isArray(value)) {
    return value
  }
  return value ? [value] : []
}

function parseSubjects (aggregations) {
  const aggregation = (aggregations || []).find(function (agg) {
    return agg.name === 'longSubject'
  })
  return (aggregation ? aggregation.entries : []).map(function (entry) {
    return { name: entry.value, count: entry.doc_count }
  })
}

function parseDepartments (data) {
  return (data || []).map(function (record) {
    const details = record['@template'].details
    return {
      name: details.cleanSummaryTitle || details.summaryTitle || '',
      code: details.referenceNumber || '',
      subjects: toArray(details.subjects)
    }
  })
}

async function search (query) {
  const response = await fetch(SEARCH_API_URL + '?' + query)
  if (!response.ok) {
    throw new Error('Search API responded with ' + response.status)
  }
  return response.json()
}

async function fetchBrowseData () {
  const json = await search(DEPARTMENTS_QUERY)
  return {
    subjects: parseSubjects(json.aggregations),
    departments: parseDepartments(json.data)
  }
}

async function fetchLevelCount (code, level) {
  const json = await search(
    'size=0&filter=level:' + level + ';longCollection:' + encodeURIComponent(code)
  )
  return (json.stats && json.stats.total) || 0
}

async function fetchDivisions (code) {
  const json = await search(
    'size=100&filter=level:Division;longCollection:' + encodeURIComponent(code)
  )
  return (json.data || []).map(function (record) {
    const details = record['@template'].details
    return {
      name: details.cleanSummaryTitle || details.summaryTitle || '',
      dates: details.dateCovering || '',
      iaid: details.iaid || ''
    }
  })
}

module.exports = {
  fetchBrowseData,
  fetchLevelCount,
  fetchDivisions
}
