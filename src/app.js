import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Watchjs from 'melanke-watchjs';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';

const app = async () => {
  await i18next.init({
    lng: 'en',
    debug: true,
    resources: {
      en: {
        translation: {
          errors: {
            duplicateEntry: 'duplicate entry',
          },
        },
      },
    },
  });

  const state = {
    form: {
      value: '',
      error: '',
      valid: true,
    },
    feeds: [],
    posts: [],
  };

  const schema = yup.string().url();

  const validate = (feeds, value) => {
    if (feeds.map((feed) => feed.link).includes(value)) {
      return i18next.t('errors.duplicateEntry');
    }
    try {
      schema.validateSync(value);
      return '';
    } catch (e) {
      return e.message;
    }
  };

  const renderError = (elements, error) => {
    const errorElement = elements.rssForm.nextElementSibling;
    if (errorElement) {
      elements.rssInput.classList.remove('is-invalid');
      errorElement.remove();
    }
    if (error === '') {
      return;
    }
    elements.rssInput.classList.add('is-invalid');
    const feedbackElement = document.createElement('div');
    feedbackElement.classList.add('feedback', 'text-danger');
    feedbackElement.innerHTML = error;
    elements.rssForm.after(feedbackElement);
  };

  const parse = (xml) => {
    const domParser = new DOMParser();
    return domParser.parseFromString(xml, 'text/xml');
  };

  const getFeed = (url) => axios.get(url)
    .then((response) => parse(response.data));

  const proxify = (url) => `https://cors-anywhere.herokuapp.com/${url}`;

  const elements = {
    rssForm: document.querySelector('.rss-form'),
    rssInput: document.querySelector('.rss-input'),
    rssButton: document.querySelector('button[type="submit"]'),
  };

  elements.rssInput.addEventListener('input', (e) => {
    state.form.value = e.target.value;
    state.form.error = validate(state.feeds, state.form.value);
  });

  elements.rssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    getFeed(proxify(state.form.value))
      .then((dom) => {
        const title = dom.querySelector('title').textContent;
        const description = dom.querySelector('description').textContent;
        const postsElements = dom.querySelectorAll('item');
        const id = _.uniqueId();
        state.feeds.push({
          link: state.form.value, id, title, description,
        });
        state.posts = [...postsElements].map((post) => {
          const postTitle = post.querySelector('title').textContent;
          const postLink = post.querySelector('link').textContent;
          return {
            title: postTitle, link: postLink, feedId: id, id: _.uniqueId(),
          };
        });
      })
      .catch((error) => {
        state.form.error = error;
      });
    elements.rssInput.value = '';
  });

  const { watch } = Watchjs;

  watch(state.form, 'error', () => {
    state.form.valid = state.form.error === '';
    renderError(elements, state.form.error);
  });

  watch(state.form, 'valid', () => {
    elements.rssButton.disabled = !state.form.valid;
  });

  watch(state, 'feeds', () => {
    document.querySelectorAll('.text-muted').forEach((element) => element.remove());
    state.feeds.forEach((feed) => {
      const p = document.createElement('p');
      p.classList.add('text-muted');
      // p.textContent = `${feed.title} ${feed.description}`;
      p.textContent = `${feed.link}`;
      elements.rssForm.before(p);
    });
  });

  watch(state, 'posts', () => {
    const col = document.querySelector('.col');
    document.querySelectorAll('.post').forEach((el) => el.remove());
    state.posts.forEach((post) => {
      const div = document.createElement('div');
      div.classList.add('post');
      const a = document.createElement('a');
      a.setAttribute('href', post.link);
      a.textContent = post.title;
      col.appendChild(div);
      div.appendChild(a);
    });
  });
};

app();
