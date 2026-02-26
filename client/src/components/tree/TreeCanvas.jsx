import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { buildHierarchy, fitToScreen } from '../../utils/treeLayout';

// Pure SVG person node (no foreignObject — works in Safari)
function SvgPersonNode({ x, y, person, isSelected, onClick }) {
  const isMale = person.gender === 'male';
  const isDeceased = person.status === 'deceased';
  const w = 130;
  const h = 54;
  const rx = isMale ? 10 : 27;

  const birthYear = person.birth_date?.match(/\d{4}/)?.[0] || '';
  const deathYear = person.death_date?.match(/\d{4}/)?.[0] || '';
  const dateStr = birthYear && deathYear ? `${birthYear} - ${deathYear}` : birthYear || '';

  const borderColor = isSelected
    ? (isMale ? '#b8860b' : '#d63384')
    : (isMale ? '#996f0a' : '#c2185b');
  const fillColor = isMale ? '#fdf8ed' : '#fdf2f8';
  const opacity = isDeceased ? 0.7 : 1;

  return (
    <g
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      onClick={() => onClick?.(person)}
      style={{ cursor: 'pointer' }}
      opacity={opacity}
    >
      {/* Selection glow */}
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={w + 8}
          height={h + 8}
          rx={rx + 3}
          ry={rx + 3}
          fill="none"
          stroke={isMale ? 'rgba(184,134,11,0.4)' : 'rgba(214,51,132,0.4)'}
          strokeWidth={4}
        />
      )}

      {/* Drop shadow */}
      <rect
        x={2}
        y={2}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill="rgba(0,0,0,0.08)"
      />

      {/* Background */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={isSelected ? 2.5 : 2}
      />

      {/* Name */}
      <text
        x={w / 2}
        y={h / 2 - (dateStr ? 5 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isDeceased ? '#6b7280' : '#1e293b'}
        fontSize="14"
        fontWeight="700"
        fontFamily="'Noto Kufi Arabic', sans-serif"
      >
        {person.first_name}
      </text>

      {/* Dates */}
      {dateStr && (
        <text
          x={w / 2}
          y={h / 2 + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#6b7280"
          fontSize="10"
          fontFamily="sans-serif"
          direction="ltr"
        >
          {dateStr}
        </text>
      )}

      {/* Deceased small text */}
      {isDeceased && !dateStr && (
        <text
          x={w / 2}
          y={h / 2 + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#9ca3af"
          fontSize="9"
          fontFamily="'Noto Kufi Arabic', sans-serif"
        >
          رحمه الله
        </text>
      )}
    </g>
  );
}

// Pure SVG spouse node (smaller)
function SvgSpouseNode({ x, y, spouse, relationship, onClick }) {
  const isMale = spouse.gender === 'male';
  const isDeceased = spouse.status === 'deceased';

  // Build display name with father's name
  const connector = isMale ? 'بن' : 'بنت';
  const fatherName = spouse.father_first_name;
  const displayName = fatherName
    ? `${spouse.first_name} ${connector} ${fatherName}`
    : spouse.first_name;

  const hasSubtext = relationship.marriage_order > 1;
  const w = 135;
  const h = 44;
  const rx = isMale ? 8 : 22;

  const borderColor = isMale ? 'rgba(153,111,10,0.6)' : 'rgba(194,24,91,0.6)';
  const fillColor = isMale ? '#fef9f0' : '#fef2f7';
  const opacity = isDeceased ? 0.65 : 1;

  return (
    <g
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      onClick={() => onClick?.(spouse)}
      style={{ cursor: 'pointer' }}
      opacity={opacity}
    >
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={1.5}
        strokeDasharray="6,3"
      />
      <text
        x={w / 2}
        y={h / 2 - (hasSubtext ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isDeceased ? '#9ca3af' : '#374151'}
        fontSize="11"
        fontWeight="500"
        fontFamily="'Noto Kufi Arabic', sans-serif"
      >
        {displayName}
      </text>
      {hasSubtext && (
        <text
          x={w / 2}
          y={h / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#9ca3af"
          fontSize="9"
          fontFamily="'Noto Kufi Arabic', sans-serif"
        >
          الزوجة {relationship.marriage_order}
        </text>
      )}
    </g>
  );
}

export default function TreeCanvas({
  persons,
  spouses,
  rootPersonId,
  lineageMode,
  selectedPerson,
  onSelectPerson,
  maxDepth,
  hasMore,
}) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const containerRef = useRef(null);
  const hierarchyRef = useRef(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());

  const toggleCollapse = useCallback((nodeId) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Build hierarchy when data changes
  useEffect(() => {
    if (!persons.length || !rootPersonId) {
      setHierarchy(null);
      hierarchyRef.current = null;
      return;
    }
    const h = buildHierarchy(persons, spouses, rootPersonId, lineageMode, maxDepth, collapsedNodes);
    setHierarchy(h);
    hierarchyRef.current = h;
  }, [persons, spouses, rootPersonId, lineageMode, maxDepth, collapsedNodes]);

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // D3 zoom
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom()
      .scaleExtent([0.05, 4])
      .on('zoom', (event) => {
        setTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
      });
    svg.call(zoom);
    zoomRef.current = zoom;
    return () => { svg.on('.zoom', null); };
  }, [hierarchy]);

  // Fit to screen only on initial load, root change, or lineage mode change — not on person edits
  const fittedRef = useRef(false);
  useEffect(() => {
    fittedRef.current = false;
  }, [rootPersonId, lineageMode]);

  useEffect(() => {
    if (!hierarchy || !svgRef.current || !zoomRef.current || !dimensions.width || !dimensions.height) return;
    if (fittedRef.current) return;
    fittedRef.current = true;
    const svg = d3.select(svgRef.current);
    const newTransform = fitToScreen(hierarchy, dimensions.width, dimensions.height);
    svg.transition().duration(750).call(zoomRef.current.transform, newTransform);
  }, [hierarchy, dimensions]);

  // Pan to selected person
  useEffect(() => {
    if (!selectedPerson || !hierarchyRef.current || !svgRef.current || !zoomRef.current || !dimensions.width) return;
    const targetNode = hierarchyRef.current.descendants().find(n => n.data.id === selectedPerson.id);
    if (!targetNode) return;

    const svg = d3.select(svgRef.current);
    const scale = Math.max(transform.k, 0.6); // keep at least current zoom or 0.6
    const tx = dimensions.width / 2 - targetNode.x * scale - 150; // offset for detail panel
    const ty = dimensions.height / 2 - targetNode.y * scale;
    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition().duration(500).call(zoomRef.current.transform, newTransform);
  }, [selectedPerson]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!hierarchy || !svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const ft = fitToScreen(hierarchy, dimensions.width, dimensions.height);
    svg.transition().duration(750).call(zoomRef.current.transform, ft);
  }, [hierarchy, dimensions]);

  // Build spouse map
  const spouseMap = new Map();
  const personMap = new Map(persons.map(p => [p.id, p]));
  for (const s of spouses) {
    const add = (pid, sid) => {
      if (!spouseMap.has(pid)) spouseMap.set(pid, []);
      const sp = personMap.get(sid);
      if (sp) spouseMap.get(pid).push({ spouse: sp, relationship: s });
    };
    add(s.person_a_id, s.person_b_id);
    add(s.person_b_id, s.person_a_id);
  }

  const nodes = hierarchy ? hierarchy.descendants() : [];
  const links = hierarchy ? hierarchy.links() : [];
  const hasData = hierarchy && nodes.length > 0;

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '400px' }}>
      {!hasData ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="text-4xl mb-3">🌳</div>
            <p>لا توجد بيانات لعرضها</p>
          </div>
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            width={dimensions.width || '100%'}
            height={dimensions.height || '100%'}
            style={{ width: '100%', height: '100%', display: 'block', background: '#f8f9fb' }}
          >
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {/* Links */}
              {links.map((link, i) => {
                const sx = link.source.x, sy = link.source.y + 30;
                const tx = link.target.x, ty = link.target.y - 30;
                const my = (sy + ty) / 2;
                return (
                  <path
                    key={`l-${i}`}
                    d={`M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                    fill="none"
                    stroke="rgba(153,111,10,0.35)"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Group labels ("من فاطمة" or "أبناء فاطمة") */}
              {nodes.map((node) => {
                const groups = node.data.childrenGroups;
                if (!groups || !node.children) return null;
                const hasImported = groups.some(g => g.isImported);
                // Show labels when multiple groups OR when there are imported children
                if (groups.length <= 1 && !hasImported) return null;
                return groups.map((group, gi) => {
                  const firstChild = node.children?.find(c =>
                    group.children.some(gc => gc.id === c.data.id)
                  );
                  if (!firstChild) return null;
                  const label = group.isImported
                    ? `أبناء ${group.parentName}`
                    : `من ${group.parentName}`;
                  const labelColor = group.isImported
                    ? 'rgba(37,99,235,0.8)'    // blue for imported
                    : 'rgba(153,111,10,0.7)';  // gold
                  return (
                    <text
                      key={`grp-${node.data.id}-${gi}`}
                      x={firstChild.x}
                      y={firstChild.y - 40}
                      textAnchor="middle"
                      fill={labelColor}
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="'Noto Kufi Arabic', sans-serif"
                    >
                      {label}
                    </text>
                  );
                });
              })}

              {/* Person nodes + spouse nodes + connectors */}
              {nodes.map((node, nodeIdx) => {
                const person = node.data.person;
                const isRef = node.data._isReference;
                const nodeSpouses = isRef ? [] : (spouseMap.get(person.id) || [])
                  .sort((a, b) => (a.relationship.marriage_order || 1) - (b.relationship.marriage_order || 1));

                const spouseSpacing = 150;
                const elements = [];
                // Use nodeIdx in keys to avoid duplicates for reference nodes
                const keyPrefix = isRef ? `ref-${nodeIdx}` : `person-${person.id}`;

                // Main person node
                elements.push(
                  <SvgPersonNode
                    key={keyPrefix}
                    x={node.x}
                    y={node.y}
                    person={person}
                    isSelected={selectedPerson?.id === person.id}
                    onClick={onSelectPerson}
                  />
                );

                // Collapse/expand indicator OR depth boundary indicator
                if (node.data._hasChildren) {
                  const isAtDepthBoundary = node.data.depth >= maxDepth && hasMore;
                  const isCollapsed = node.data._collapsed;
                  const btnY = node.y + 32;

                  if (isAtDepthBoundary) {
                    // Depth boundary: show "⋯" to indicate more generations exist
                    elements.push(
                      <g
                        key={`depth-boundary-${keyPrefix}`}
                        transform={`translate(${node.x}, ${btnY})`}
                      >
                        <circle
                          r={12}
                          fill="rgba(184,134,11,0.1)"
                          stroke="rgba(184,134,11,0.4)"
                          strokeWidth={1.5}
                          strokeDasharray="3,2"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#996f0a"
                          fontSize="13"
                          fontFamily="sans-serif"
                        >
                          ⋯
                        </text>
                      </g>
                    );
                  } else {
                    // Normal collapse/expand button
                    elements.push(
                      <g
                        key={`collapse-${keyPrefix}`}
                        transform={`translate(${node.x}, ${btnY})`}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(person.id); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          r={12}
                          fill={isCollapsed ? 'rgba(184,134,11,0.15)' : '#ffffff'}
                          stroke={isCollapsed ? '#b8860b' : 'rgba(153,111,10,0.4)'}
                          strokeWidth={1.5}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isCollapsed ? '#b8860b' : '#6b7280'}
                          fontSize="15"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {isCollapsed ? '+' : '−'}
                        </text>
                      </g>
                    );
                  }
                }

                // Spouse nodes positioned to the left (RTL: visual left = logically "after")
                nodeSpouses.forEach((sp, si) => {
                  const spouseX = node.x - (si + 1) * spouseSpacing;
                  const spouseY = node.y;

                  // Connector line
                  const lineStartX = node.x - 65; // edge of person node
                  const lineEndX = spouseX + 67;   // edge of spouse node
                  elements.push(
                    <line
                      key={`conn-${keyPrefix}-${sp.spouse.id}`}
                      x1={lineStartX}
                      y1={spouseY}
                      x2={lineEndX}
                      y2={spouseY}
                      stroke="rgba(153,111,10,0.35)"
                      strokeWidth={2}
                      strokeDasharray="6,4"
                    />
                  );

                  elements.push(
                    <SvgSpouseNode
                      key={`spouse-${sp.spouse.id}-${si}`}
                      x={spouseX}
                      y={spouseY}
                      spouse={sp.spouse}
                      relationship={sp.relationship}
                      onClick={onSelectPerson}
                    />
                  );
                });

                return <g key={`nodegroup-${keyPrefix}`}>{elements}</g>;
              })}
            </g>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-20">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center text-lg cursor-pointer shadow-sm"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center text-lg cursor-pointer shadow-sm"
            >
              −
            </button>
            <button
              onClick={handleFitToScreen}
              className="w-10 h-10 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center text-xs cursor-pointer shadow-sm"
              title="ملاءمة"
            >
              ⊞
            </button>
          </div>
        </>
      )}
    </div>
  );
}
