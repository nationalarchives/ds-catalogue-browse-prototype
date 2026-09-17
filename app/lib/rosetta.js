const SEARCH_API_URL = process.env.ROSETTA_API_URL
  || 'https://rosetta-staging.k-int.com/rosetta/data/search'

const DEPARTMENTS_QUERY = 'size=1000&aggs=longSubject&filter=level:Lettercode;group:tna'

const HIERARCHY_LEVELS = [
  'Lettercode',
  'Division',
  'Series',
  'Sub-series',
  'Sub-sub-series',
  'Piece',
  'Item'
]

function toArray (value) {
  if (Array.isArray(value)) {
    return value
  }
  return value ? [value] : []
}

function formatDates (value) {
  if (!value) {
    return ''
  }
  return String(value).replace('-', '–')
}

function seriesLabel (count) {
  if (!count) {
    return ''
  }
  return count + ' series'
}

function displayType (level) {
  if (level === 'Lettercode') {
    return 'Department'
  }
  return level || ''
}

function parseSubjects (aggregations) {
  const aggregation = (aggregations || []).find(function (agg) {
    return agg.name === 'longSubject'
  })
  return (aggregation ? aggregation.entries : []).map(function (entry) {
    return { name: entry.value, count: entry.doc_count }
  })
}

function parseRecord (record) {
  const details = record['@template'].details
  const level = details.level && details.level.value
  return {
    id: details.iaid || details.id || '',
    name: details.cleanSummaryTitle || details.summaryTitle || '',
    code: details.referenceNumber || '',
    dates: formatDates(details.dateCovering),
    level: level || '',
    type: displayType(level),
    subjects: toArray(details.subjects)
  }
}

async function fetchSearch (query) {
  const response = await fetch(SEARCH_API_URL + '?' + query)
  if (!response.ok) {
    throw new Error('Search API responded with ' + response.status)
  }
  return response.json()
}

function hierarchyQuery (id, level, size) {
  return 'size=' + size + '&filter=hierarchy:' + encodeURIComponent(id) +
    ';level:' + encodeURIComponent(level)
}

async function fetchRecords (id, level) {
  const json = await fetchSearch(hierarchyQuery(id, level, 1000))
  return (json.data || []).map(parseRecord)
}

async function fetchTotal (id, level) {
  const json = await fetchSearch(hierarchyQuery(id, level, 0))
  return json.stats ? json.stats.total : 0
}

function nextLevels (currentLevel) {
  const index = HIERARCHY_LEVELS.indexOf(currentLevel)
  if (index === -1) {
    return HIERARCHY_LEVELS.slice(1)
  }
  return HIERARCHY_LEVELS.slice(index + 1)
}

async function fetchNextChildren (id, currentLevel) {
  const levels = nextLevels(currentLevel)
  for (let i = 0; i < levels.length; i++) {
    const records = await fetchRecords(id, levels[i])
    if (records.length > 0) {
      return records
    }
  }
  return []
}

function pathHref (segments) {
  return '/department/' + segments.map(encodeURIComponent).join('/')
}

function departmentHref (department, extraIds) {
  const first = department.code || department.id
  return pathHref([first].concat(extraIds || []))
}

function toTreeItem (record, href) {
  return {
    id: record.id,
    name: record.name,
    href: href,
    detailsHref: href + '/details',
    dates: record.dates,
    code: record.code || '',
    countLabel: '',
    type: record.type,
    level: record.level,
    selected: false,
    children: []
  }
}

function buildTree (archive, trail) {
  const root = Object.assign({}, archive, { children: [] })
  let parent = root
  trail.forEach(function (item, index) {
    const node = Object.assign({}, item, {
      children: index === trail.length - 1 ? item.children : []
    })
    parent.children.push(node)
    parent = node
  })
  return [root]
}

async function fetchBrowseData () {
  const json = await fetchSearch(DEPARTMENTS_QUERY)
  return {
    subjects: parseSubjects(json.aggregations),
    departments: (json.data || []).map(parseRecord)
  }
}

async function fetchBrowsePage (ids) {
  if (!ids.length) {
    return null
  }

  const browse = await fetchBrowseData()
  const department = browse.departments.find(function (item) {
    return item.id === ids[0] || item.code === ids[0]
  })

  if (!department) {
    return null
  }

  const trailIds = []
  const trail = [toTreeItem(department, departmentHref(department))]
  let current = department

  for (let i = 1; i < ids.length; i++) {
    const siblings = await fetchNextChildren(current.id, current.level)
    const next = siblings.find(function (item) {
      return item.id === ids[i]
    })
    if (!next) {
      return null
    }
    trailIds.push(next.id)
    trail.push(toTreeItem(next, departmentHref(department, trailIds)))
    current = next
  }

  const selected = trail[trail.length - 1]
  selected.selected = true

  const [children, seriesCount] = await Promise.all([
    fetchNextChildren(selected.id, selected.level),
    selected.level === 'Lettercode' || selected.level === 'Division'
      ? fetchTotal(selected.id, 'Series')
      : Promise.resolve(0)
  ])

  selected.countLabel = seriesLabel(seriesCount)
  selected.children = children.map(function (child) {
    return toTreeItem(child, departmentHref(department, trailIds.concat(child.id)))
  })

  return {
    pageTitle: selected.name,
    tree: buildTree({
      name: 'The National Archives',
      href: '/',
      countLabel: browse.departments.length + ' departments'
    }, trail)
  }
}

module.exports = { fetchBrowseData, fetchBrowsePage, departmentHref }
