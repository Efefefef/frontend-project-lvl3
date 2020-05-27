import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import startWatch from './watchers';

const app = async () => {
  await i18next.init({
    lng: 'en',
    debug: true,
    resources: {
      en: {
        translation: {
          errors: {
            duplicateEntry: 'Duplicate entry',
            updateNetworkError: 'Error: Update failed. Retrying...',
          },
        },
      },
    },
  });

  const state = {
    form: {
      value: '',
      error: '',
    },
    feeds: [],
    posts: [],
  };

  const elements = {
    rssForm: document.querySelector('.rss-form'),
    rssInput: document.querySelector('.rss-input'),
    rssButton: document.querySelector('button[type="submit"]'),
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

  const proxify = (url) => `https://cors-anywhere.herokuapp.com/${url}`;

  const getFeed = (url) => axios.get(url);
  const parse = (xml) => {
    const domParser = new DOMParser();
    const dom = domParser.parseFromString(xml, 'text/xml');
    const title = dom.querySelector('title').textContent;
    const description = dom.querySelector('description').textContent;
    const feed = {
      link: state.form.value, title, description,
    };
    const postsElements = dom.querySelectorAll('item');
    const posts = [...postsElements].map((post) => {
      const postTitle = post.querySelector('title').textContent;
      const postLink = post.querySelector('link').textContent;
      return {
        title: postTitle, link: postLink,
      };
    });
    return { feed, posts };
  };

  const assignFeedId = (object, feedId) => ({ ...object, feedId });

  elements.rssInput.addEventListener('input', (e) => {
    state.form.value = e.target.value;
    state.form.error = validate(state.feeds, state.form.value);
  });

  elements.rssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    getFeed(proxify(state.form.value))
      .then((response) => parse(response.data))
      .then(({ feed, posts }) => {
        const id = _.uniqueId();
        state.feeds = [...state.feeds, assignFeedId(feed, id)];
        const postsWithId = posts.map((post) => assignFeedId(post, id));
        state.posts = [...postsWithId, ...state.posts];
        state.form.error = '';
      })
      .catch((error) => {
        state.form.error = error;
      });
    elements.rssInput.value = '';
  });

  const checkUpdates = () => {
    Promise.all(state.feeds.map(
      (feed) => new Promise(((resolve) => {
        const fetchedPostsLinks = state.posts
          .filter((post) => post.feedId === feed.feedId)
          .map((post) => post.link);
        getFeed(proxify(feed.link))
          .then((response) => parse(response.data))
          .then(({ posts }) => {
            const newPosts = posts.filter((post) => !fetchedPostsLinks.includes(post.link));
            const newPostsWithIds = newPosts.map((post) => assignFeedId(post, feed.feedId));
            state.posts = [...newPostsWithIds, ...state.posts];
            state.form.error = '';
            resolve();
          })
          .catch(() => {
            state.form.error = i18next.t('errors.updateNetworkError');
            resolve();
          });
      })),
    ))
      .then(() => setTimeout(checkUpdates, 5000));
  };

  startWatch(state, elements);
  checkUpdates();
};

app();
