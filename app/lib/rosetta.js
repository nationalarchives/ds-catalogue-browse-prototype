const SEARCH_API_URL = process.env.ROSETTA_API_URL
  || 'https://rosetta-staging.k-int.com/rosetta/data/search'

const RECORD_API_URL = SEARCH_API_URL.replace(/\/search$/, '/get')

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
    description: details.cleanDescription || details.description || '',
    heldBy: details.heldBy || '',
    digitised: details.digitised || false,
    subjects: toArray(details.subjects)
  }
}

function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function strong (value) {
  return '<strong>' + escapeHtml(value) + '</strong>'
}

function buildWhatsItAbout (record, seriesName) {
  let sentence = 'This record is about ' + strong(record.name || 'this record')
  if (record.dates) {
    sentence += ' dating from ' + strong(record.dates)
  }
  if (seriesName) {
    sentence += ' in the series ' + strong(seriesName)
  }
  sentence += '.'
  if (record.heldBy) {
    sentence += ' It is held at ' + strong(record.heldBy) + '.'
  }
  return sentence
}

function buildAvailableOnline (record) {
  if (record.digitised) {
    return 'Yes, this record is available to view online. <a href="#">View online.</a>'
  }
  return 'No, this record is not available online. However, you can order a copy. <a href="#">How to view it.</a>'
}

function buildInPerson (record) {
  const place = record.heldBy || 'The National Archives'
  return 'Yes, this record is held at ' + escapeHtml(place) +
    ' and is available to see in person. <a href="#">Other ways to view it.</a>'
}

function recordUrl (id) {
  if (!id) {
    return ''
  }
  return 'https://beta.nationalarchives.gov.uk/catalogue/id/' + id + '/'
}

function cleanArrangement (value) {
  if (!value) {
    return ''
  }
  return String(value)
    .replace(/<head>[\s\S]*?<\/head>/gi, '')
    .replace(/<(?!\/?p\b)[^>]+>/gi, '')
    .trim()
}

function buildRecord (record, context) {
  const ctx = context || {}
  const details = ctx.details || {}
  return {
    title: record.name,
    type: record.type,
    level: record.level,
    orderable: record.level === 'Piece' || record.level === 'Item',
    reference: record.code || '',
    date: record.dates || '',
    description: record.description || '',
    arrangement: cleanArrangement(details.arrangement),
    heldBy: record.heldBy || '',
    subjects: record.subjects || [],
    legalStatus: details.legalStatus || '',
    closureStatus: details.closureStatus || '',
    recordUrl: recordUrl(record.id),
    recordsHref: ctx.recordsHref || '',
    seriesInfo: ctx.seriesInfo || null,
    whatsItAbout: buildWhatsItAbout(record, ctx.seriesName),
    availableOnline: buildAvailableOnline(record),
    inPerson: buildInPerson(record)
  }
}

async function fetchSearch (query) {
  const response = await fetch(SEARCH_API_URL + '?' + query)
  if (!response.ok) {
    throw new Error('Search API responded with ' + response.status)
  }
  return response.json()
}

async function fetchRecord (id) {
  const response = await fetch(RECORD_API_URL + '?id=' + encodeURIComponent(id))
  if (!response.ok) {
    throw new Error('Record API responded with ' + response.status)
  }
  const json = await response.json()
  const data = json.data || []
  return data.length ? data[0]['@template'].details : null
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
  let selectedSiblings = browse.departments

  for (let i = 1; i < ids.length; i++) {
    const siblings = await fetchNextChildren(current.id, current.level)
    const next = siblings.find(function (item) {
      return item.id === ids[i]
    })
    if (!next) {
      return null
    }
    selectedSiblings = siblings
    trailIds.push(next.id)
    trail.push(toTreeItem(next, departmentHref(department, trailIds)))
    current = next
  }

  const selected = trail[trail.length - 1]
  selected.selected = true

  const seriesItem = trail.find(function (item) {
    return item.level === 'Series'
  })
  const seriesName = seriesItem ? seriesItem.name : ''
  const seriesInfo = seriesItem ? {
    reference: seriesItem.code,
    title: seriesItem.name,
    href: seriesItem.detailsHref,
    isSelf: seriesItem.id === current.id
  } : null

  if (trailIds.length) {
    const index = selectedSiblings.findIndex(function (item) {
      return item.id === current.id
    })
    const parentIds = trailIds.slice(0, -1)
    const siblingRecord = function (sibling) {
      return {
        name: sibling.name,
        code: sibling.code,
        href: departmentHref(department, parentIds.concat(sibling.id)) + '/details'
      }
    }
    const previousSibling = index > 0 ? selectedSiblings[index - 1] : null
    const nextSibling = index !== -1 ? selectedSiblings[index + 1] : null
    if (previousSibling) {
      selected.previousRecord = siblingRecord(previousSibling)
    }
    if (nextSibling) {
      selected.nextRecord = siblingRecord(nextSibling)
    }
  }

  const [children, seriesCount, details] = await Promise.all([
    fetchNextChildren(selected.id, selected.level),
    selected.level === 'Lettercode' || selected.level === 'Division'
      ? fetchTotal(selected.id, 'Series')
      : Promise.resolve(0),
    fetchRecord(current.id).catch(function () { return null })
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
    }, trail),
    record: buildRecord(current, {
      seriesName: seriesName,
      seriesInfo: seriesInfo,
      recordsHref: selected.href,
      details: details
    })
  }
}

module.exports = { fetchBrowseData, fetchBrowsePage, departmentHref }
