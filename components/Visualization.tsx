import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { EpisodeStructure } from '../types';

interface VisualizationProps {
  structure: EpisodeStructure;
}

const Visualization: React.FC<VisualizationProps> = ({ structure }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!structure || !svgRef.current || !containerRef.current) return;

    // Transform data for D3 hierarchy
    const data = {
      name: "Episode",
      children: structure.acts.map(act => ({
        name: `Act ${act.act_number}`,
        children: act.scenes.map(scene => ({
          name: `Scene ${scene.scene_number}`,
          children: scene.beats.map(beat => ({
            name: beat.beat_id,
            value: 1
          }))
        }))
      }))
    };

    const width = containerRef.current.clientWidth;
    const height = 400;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,0)");

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([height - 40, width - 160]);
    treeLayout(root);

    // Links
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#374151') // gray-700
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      );

    // Nodes
    const nodes = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    nodes.append('circle')
      .attr('r', 4)
      .attr('fill', (d) => {
        if (d.depth === 0) return '#ec4899'; // pink
        if (d.depth === 3) return '#06b6d4'; // cyan (beats)
        return '#9ca3af'; // gray
      })
      .attr('stroke', '#111827')
      .attr('stroke-width', 2);

    nodes.append('text')
      .attr('dy', '.31em')
      .attr('x', (d) => d.children ? -8 : 8)
      .attr('text-anchor', (d) => d.children ? 'end' : 'start')
      .text((d: any) => d.data.name)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

  }, [structure]);

  return (
    <div ref={containerRef} className="w-full h-[400px] overflow-hidden bg-nano-900 rounded-lg border border-gray-800">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default Visualization;