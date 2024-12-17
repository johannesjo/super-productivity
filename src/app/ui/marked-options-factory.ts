import { MarkedOptions, MarkedRenderer } from 'ngx-markdown';

export const markedOptionsFactory = (): MarkedOptions => {
  const renderer = new MarkedRenderer();

  renderer.checkbox = ({ checked }) =>
    `<span class="checkbox material-icons">${checked ? 'check_box' : 'check_box_outline_blank'}</span>`;

  renderer.listitem = (listItem) =>
    listItem.text.includes('checkbox')
      ? `<li class="checkbox-wrapper ${listItem.text.includes('check_box_outline_blank') ? 'undone' : 'done'}">${listItem.text}</li>`
      : `<li>${listItem.text}</li>`;

  renderer.link = ({ href, title, text }) =>
    `<a target="_blank" href="${href}" title="${title}">${text}</a>`;

  renderer.paragraph = ({ text }) => {
    const split = text.split('\n');
    return split.reduce((acc, p, i) => {
      const result = /h(\d)\./.exec(p);
      if (result !== null) {
        const h = `h${result[1]}`;
        return acc + `<${h}>${p.replace(result[0], '')}</${h}>`;
      }

      if (split.length === 1) {
        return `<p>` + p + `</p>`;
      }

      return acc ? (split.length - 1 === i ? acc + p + `</p>` : acc + p) : `<p>` + p;
    }, '');
  };

  // parse all RFC3986 URIs
  const urlPattern =
    /\b((([A-Za-z][A-Za-z0-9+.-]*):\/\/([^\/?#]*))([^?#]*)(\?([^#]*))?(#(.*))?)\b/gi;

  const rendererTxtOld = renderer.text;
  renderer.text = (p) => {
    return rendererTxtOld({
      ...p,
      text: p.text.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank">${url}</a>`;
      }),
    });
  };

  return {
    renderer,
    gfm: true,
    breaks: false,
    pedantic: false,
  };
};
