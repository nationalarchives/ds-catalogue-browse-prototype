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

async function fetchBrowseData () {
  const response = await fetch(SEARCH_API_URL + '?' + DEPARTMENTS_QUERY)
  if (!response.ok) {
    throw new Error('Search API responded with ' + response.status)
  }
  const json = await response.json()
  return {
    subjects: parseSubjects(json.aggregations),
    departments: parseDepartments(json.data)
  }
}

module.exports = { fetchBrowseData }
