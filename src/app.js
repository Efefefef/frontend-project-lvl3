import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import startWatch from './watchers';

const proxify = (url) => `https://cors-anywhere.herokuapp.com/${url}`;

const parse = (xml) => {
  const domParser = new DOMParser();
  const dom = domParser.parseFromString(xml, 'text/xml');
  const title = dom.querySelector('title').textContent;
  const description = dom.querySelector('description').textContent;
  const feed = {
    title, description,
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

export default async () => {
  await i18next.init({
    lng: 'en',
    debug: true,
    resources: {
      en: {
        translation: {
          errors: {
            duplicateEntry: 'Duplicate entry',
            invalidUrl: 'this must be a valid URL',
            updateNetworkError: 'Error: Update failed. Retrying...',
          },
          loadedMessage: 'Rss has been loaded',
        },
      },
    },
  });

  const state = {
    form: {
      value: '',
      state: 'filling',
      errors: {
        validation: null,
        addition: null,
        update: null,
      },
    },
    feeds: [],
    posts: [],
  };

  const elements = {
    rssForm: document.querySelector('.rss-form'),
    rssInput: document.querySelector('.rss-input'),
    rssButton: document.querySelector('button[type="submit"]'),
  };


  const validate = (feeds, value) => {
    const feedLinks = feeds.map((feed) => feed.link);
    const schema = yup.string().notOneOf(feedLinks, 'errors.duplicateEntry').url('errors.invalidUrl');
    try {
      schema.validateSync(value);
      return null;
    } catch (e) {
      return e.message;
    }
  };

  const assignFeedId = (object, feedId) => ({ ...object, feedId });

  elements.rssInput.addEventListener('input', (e) => {
    state.form.value = e.target.value;
    state.form.errors.validation = validate(state.feeds, state.form.value);
    state.form.state = 'filling';
    state.form.errors.addition = null;
  });

  elements.rssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.state = 'processing';
    axios.get(proxify(state.form.value))
      .then((response) => parse(response.data))
      .then(({ feed, posts }) => {
        const id = _.uniqueId();
        state.feeds.push(assignFeedId({ ...feed, link: state.form.value }, id));
        const postsWithId = posts.map((post) => assignFeedId(post, id));
        state.posts.unshift(...postsWithId);
        state.form.errors.addition = null;
        state.form.value = '';
        state.form.state = 'completed';
      })
      .catch((error) => {
        state.form.errors.addition = error;
        state.form.state = 'errored';
      });
  });

  const checkUpdates = () => {
    Promise.all(state.feeds.map((feed) => {
      const fetchedPosts = state.posts
        .filter((post) => post.feedId === feed.feedId);
      return axios.get(proxify(feed.link))
        .then((response) => parse(response.data))
        .then(({ posts }) => {
          const newPosts = _.differenceBy(posts, fetchedPosts, 'link');
          const newPostsWithIds = newPosts.map((post) => assignFeedId(post, feed.feedId));
          state.posts.unshift(...newPostsWithIds);
          state.form.errors.update = null;
        })
        .catch(() => {
          state.form.errors.update = 'errors.updateNetworkError';
        });
    })).then(() => setTimeout(checkUpdates, 5000));
  };

  startWatch(state, elements);
  checkUpdates();
};
