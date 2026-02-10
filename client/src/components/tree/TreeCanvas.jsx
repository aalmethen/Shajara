import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { buildHierarchy, fitToScreen } from '../../utils/treeLayout';

// Pure SVG person node (no foreignObject — works in Safari)
function SvgPersonNode({ x, y, person, isSelected, onClick }) {
  const isMale = person.gender === 'male';
  const isDeceased = person.status === 'deceased';
  const w = 120;
  const h = 50;
  const rx = isMale ? 8 : 25;

  const birthYear = person.birth_date?.match(/\d{4}/)?.[0] || '';
  const deathYear = person.death_date?.match(/\d{4}/)?.[0] || '';
  const dateStr = birthYear && deathYear ? `${birthYear} - ${deathYear}` : birthYear || '';

  const borderColor = isSelected
    ? (isMale ? '#d4a843' : '#f472b6')
    : (isMale ? 'rgba(212,168,67,0.5)' : 'rgba(244,114,182,0.5)');
  const fillColor = '#1e293b';
  const opacity = isDeceased ? 0.6 : 1;

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
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          rx={rx + 2}
          ry={rx + 2}
          fill="none"
          stroke={isMale ? 'rgba(212,168,67,0.3)' : 'rgba(244,114,182,0.3)'}
          strokeWidth={3}
        />
      )}

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
        strokeWidth={isSelected ? 2.5 : 1.5}
      />

      {/* Name */}
      <text
        x={w / 2}
        y={h / 2 - (dateStr ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isDeceased ? '#9ca3af' : '#ffffff'}
        fontSize="13"
        fontWeight="600"
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
          fontSize="9"
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
          fill="#4b5563"
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
  const w = 90;
  const h = 38;
  const rx = isMale ? 6 : 19;

  const borderColor = isMale ? 'rgba(212,168,67,0.35)' : 'rgba(244,114,182,0.35)';
  const opacity = isDeceased ? 0.55 : 1;

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
        fill="#1e293b"
        stroke={borderColor}
        strokeWidth={1}
      />
      <text
        x={w / 2}
        y={h / 2 - (relationship.marriage_order > 1 ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isDeceased ? '#6b7280' : '#d1d5db'}
        fontSize="11"
        fontWeight="500"
        fontFamily="'Noto Kufi Arabic', sans-serif"
      >
        {spouse.first_name}
      </text>
      {relationship.marriage_order > 1 && (
        <text
          x={w / 2}
          y={h / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#4b5563"
          fontSize="8"
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

  // Fit to screen
  useEffect(() => {
    if (!hierarchy || !svgRef.current || !zoomRef.current || !dimensions.width || !dimensions.height) return;
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
            style={{ width: '100%', height: '100%', display: 'block', background: '#0f172a' }}
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
                    stroke="rgba(212,168,67,0.25)"
                    strokeWidth={1.5}
                  />
                );
              })}

              {/* Group labels ("من فاطمة") */}
              {nodes.map((node) => {
                const groups = node.data.childrenGroups;
                if (!groups || groups.length <= 1 || !node.children) return null;
                return groups.map((group, gi) => {
                  const firstChild = node.children?.find(c =>
                    group.children.some(gc => gc.id === c.data.id)
                  );
                  if (!firstChild) return null;
                  return (
                    <text
                      key={`grp-${node.data.id}-${gi}`}
                      x={firstChild.x}
                      y={firstChild.y - 40}
                      textAnchor="middle"
                      fill="rgba(212,168,67,0.6)"
                      fontSize="10"
                      fontWeight="500"
                      fontFamily="'Noto Kufi Arabic', sans-serif"
                    >
                      من {group.parentName}
                    </text>
                  );
                });
              })}

              {/* Person nodes + spouse nodes + connectors */}
              {nodes.map((node) => {
                const person = node.data.person;
                const nodeSpouses = (spouseMap.get(person.id) || [])
                  .sort((a, b) => (a.relationship.marriage_order || 1) - (b.relationship.marriage_order || 1));

                const spouseSpacing = 110;
                const elements = [];

                // Main person node
                elements.push(
                  <SvgPersonNode
                    key={`person-${person.id}`}
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
                        key={`depth-boundary-${person.id}`}
                        transform={`translate(${node.x}, ${btnY})`}
                      >
                        <circle
                          r={10}
                          fill="rgba(212,168,67,0.1)"
                          stroke="rgba(212,168,67,0.4)"
                          strokeWidth={1.5}
                          strokeDasharray="3,2"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#d4a843"
                          fontSize="12"
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
                        key={`collapse-${person.id}`}
                        transform={`translate(${node.x}, ${btnY})`}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(person.id); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          r={10}
                          fill={isCollapsed ? 'rgba(212,168,67,0.15)' : 'rgba(30,41,59,0.9)'}
                          stroke={isCollapsed ? '#d4a843' : 'rgba(212,168,67,0.3)'}
                          strokeWidth={1.5}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isCollapsed ? '#d4a843' : '#6b7280'}
                          fontSize="14"
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
                  const lineStartX = node.x - 60; // edge of person node
                  const lineEndX = spouseX + 45;   // edge of spouse node
                  elements.push(
                    <line
                      key={`conn-${person.id}-${sp.spouse.id}`}
                      x1={lineStartX}
                      y1={spouseY}
                      x2={lineEndX}
                      y2={spouseY}
                      stroke="rgba(212,168,67,0.3)"
                      strokeWidth={1.5}
                      strokeDasharray="4,3"
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

                return <g key={`nodegroup-${node.data.id}`}>{elements}</g>;
              })}
            </g>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-20">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-navy-800 border border-navy-600 rounded-lg text-white hover:bg-navy-700 transition-colors flex items-center justify-center text-lg cursor-pointer"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-navy-800 border border-navy-600 rounded-lg text-white hover:bg-navy-700 transition-colors flex items-center justify-center text-lg cursor-pointer"
            >
              −
            </button>
            <button
              onClick={handleFitToScreen}
              className="w-10 h-10 bg-navy-800 border border-navy-600 rounded-lg text-white hover:bg-navy-700 transition-colors flex items-center justify-center text-xs cursor-pointer"
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
