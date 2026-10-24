console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

//define pages for nav
let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/AndIFellInTheRiver', title: 'GitHub' }
];

//set base path for local vs github pages
const BASE_PATH = (
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'
)
  ? '/'
  : '/dsc106-lab1-portfolio/';

//create nav
let nav = document.createElement('nav');
document.body.prepend(nav);

//create links for each page
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  //fix url for all pages
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  //create link
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  //highlight
  let currentPath = location.pathname.replace(/index\.html$/, '');

  if (a.host === location.host &&
      a.pathname === currentPath) {
    a.classList.add('current');
  }

  //open in new tab if external host
  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  nav.append(a);
}

//darkmode dropdown
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

let select = document.querySelector('.color-scheme select');

//change theme when user slects an option
select.addEventListener('input', function(event) {
  let colorScheme = event.target.value;

  document.documentElement.style.setProperty(
    'color-scheme',
    colorScheme
  );

  //save preference to local storage
  localStorage.colorScheme = colorScheme;
});

//restore theme from local storage if it exists
if ('colorScheme' in localStorage) {
  let savedScheme = localStorage.colorScheme;

  document.documentElement.style.setProperty(
    'color-scheme',
    savedScheme
  );

  select.value = savedScheme;
}

//LAB 4
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

//render projects
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  for (let project of projects) {
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  }
}

//github api fetch
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}