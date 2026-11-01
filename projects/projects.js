import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const title = document.querySelector('.projects-title');

title.textContent = `${projects.length} Projects`;

renderProjects(projects, projectsContainer, 'h2');
let selectedIndex = -1;
let selectedYear = null;
let query = '';

//function to update projects based on search and pie chart selection
function updateProjects() {
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();

        let matchesSearch = values.includes(query.toLowerCase());

        let matchesYear = selectedYear === null ||
                          project.year === selectedYear;

        return matchesSearch && matchesYear;
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');
}

//function draw a circle the pie chart using d3
function renderPieChart(projectsGiven) {
    //group projects by year
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    //convert grouped data into pie chart
    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    //arc generator
    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    //pie generator
    let sliceGenerator = d3.pie().value((d) => d.value);

    let arcData = sliceGenerator(data);

    let arcs = arcData.map((d) => arcGenerator(d));

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    let svg = d3.select('#projects-pie-plot');
    //clear previous pie chart when searching
    svg.selectAll('path').remove();

    //draw pie chart
    arcs.forEach((arc, index) => {
        svg.append('path')
            .attr('d', arc)
            .attr('fill', colors(index))
            .on('click', () => selectWedge(index));
    });

    //creating legend for pie chart
    let legend = d3.select('.legend');

    //clear previous legend when searching
    legend.selectAll('li').remove();

    //function to update selection of pie chart and legend
    function updateSelection() {
    svg.selectAll('path')
        .classed('selected', (_, i) => i === selectedIndex);

    legend.selectAll('li')
        .classed('selected', (_, i) => i === selectedIndex);
    }

    //function to filter projects by selected year
    function selectWedge(i) {
        let clickedYear = data[i].label;

        if (selectedYear === clickedYear) {
            selectedYear = null;
            selectedIndex = -1;
        } else {
            selectedYear = clickedYear;
            selectedIndex = i;
        }

        updateSelection();
        updateProjects();
    }

    //create legend
    data.forEach((d, index) => {
        legend
            .append('li')
            .attr('class', 'legend-item')
            .attr('style', `--color:${colors(index)}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });

    updateSelection();
}
//shows piechart when it first loads
renderPieChart(projects);


//improved search with pie chart update
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {

    query = event.target.value;

    //filter projects based on the search
    let searchedProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    //update chart using search results
    renderPieChart(searchedProjects);

    //update displayed projects using both filters
    updateProjects();
});