import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
        let first = lines[0];

        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: 'https://github.com/AndIFellInTheRiver/dsc106-lab1-portfolio/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
            configurable: true,
            writable: true,
        });

        return ret;
        });
}

//function to render commit info
function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats')
        .append('dl')
        .attr('class', 'stats');

    //total lines of code
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    //total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    //total files
    const totalFiles = d3.group(data, (d) => d.file).size;

    dl.append('dt').text('Total files');
    dl.append('dd').text(totalFiles);

    //average line length
    const avgLineLength = d3.mean(data, (d) => d.length);

    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength.toFixed(1));

    //longest line
    const longestLine = d3.max(data, (d) => d.length);

    dl.append('dt').text('Longest line');
    dl.append('dd').text(longestLine);

    //maximum depth
    const maxDepth = d3.max(data, (d) => d.depth);

    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth);
}

//function to render tooltip content
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (!commit || Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;

    date.textContent = commit.datetime.toLocaleString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.datetime.toLocaleString('en', {
        timeStyle: 'short',
    });

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

//function to update tooltip visibility
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

//function to position tooltip near cursor
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    const offset = 15;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Prevent tooltip from going off screen
    if (x + tooltipWidth > window.innerWidth) {
        x = event.clientX - tooltipWidth - offset;
    }

    if (y + tooltipHeight > window.innerHeight) {
        y = event.clientY - tooltipHeight - offset;
    }

    tooltip.style.left = `${Math.max(0, x)}px`;
    tooltip.style.top = `${Math.max(0, y)}px`;
}

//function to render commit scatter plot
function renderScatterPlot(data, commits) {

    //chart dimensions
    const width = 1000;
    const height = 600;

    //margins
    const margin = {
        top: 10,
        right: 10,
        bottom: 30,
        left: 50
    };

    //create SVG
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    //x scale: dates
    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    //y scale: time of day
    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    //usable chart area
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    //scale ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    //radius scale based on lines edited
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    //horizontal gridlines
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
        .tickFormat('')
        .tickSize(-usableArea.width)
    );

    //drwa dots
    const dots = svg.append('g').attr('class', 'dots');

    //draw larger commits first
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    //draw dots with tooltip interaction
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
            .style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget)
            .style('fill-opacity', 0.7);

            updateTooltipVisibility(false);
        });

    //create axes
    const xAxis = d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%b %d'));

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d).padStart(2, '0') + ':00');

    //x axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    //y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);


    //check whether a commit is selected
    function isCommitSelected(selection, commit) {
        if (!selection) {
            return false;
         }

        const [[x0, y0], [x1, y1]] = selection;

        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);

        return x >= x0 && x <= x1 &&
                y >= y0 && y <= y1;
    }

//function to show number of selected commits
    function renderSelectionCount(selection) {
        const selectedCommits = selection
            ? commits.filter((d) => isCommitSelected(selection, d))
            : [];

        const countElement = document.querySelector('#selection-count');

        countElement.textContent =
            `${selectedCommits.length || 'No'} commits selected`;

        return selectedCommits;
    }

    //function to show language breakdown for selected commits
    function renderLanguageBreakdown(selection) {
        const selectedCommits = selection
            ? commits.filter((d) => isCommitSelected(selection, d))
            : [];

        const container = document.getElementById('language-breakdown');

        if (selectedCommits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const lines = selectedCommits.flatMap((d) => d.lines);

        //count lines per language
        const breakdown = d3.rollup(
            lines,
            (v) => v.length,
            (d) => d.type
        );

        //clear previous results
        container.innerHTML = '';

        for (const [language, count] of breakdown) {
            const proportion = count / lines.length;
            const formatted = d3.format('.1~%')(proportion);

            const dt = document.createElement('dt');
            dt.textContent = language;

            const dd = document.createElement('dd');
            dd.textContent = `${count} lines (${formatted})`;

            container.append(dt, dd);
        }
    }

//function to update selected dots when brushing
function brushed(event) {
    const selection = event.selection;

    dots.selectAll('circle')
        .classed('selected', (d) =>
            isCommitSelected(selection, d)
        );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}
    //brush with event listener
    svg.call(
        d3.brush()
            .extent([
                [usableArea.left, usableArea.top],
                [usableArea.right, usableArea.bottom]
            ])
            .on('start brush end', brushed)
    );

    //keep dots above the brush overlay
    svg.selectAll('.dots, .overlay ~ *').raise();
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);