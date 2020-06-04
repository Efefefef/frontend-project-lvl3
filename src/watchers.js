import Watchjs from 'melanke-watchjs';
import _ from 'lodash';
import i18next from 'i18next';

const startWatch = (state, elements) => {
  const { watch } = Watchjs;

  const renderErrors = (errors) => {
    const { rssForm, rssInput } = elements;
    const errorElements = document.querySelectorAll('.text-danger');
    if (errorElements.length > 0) {
      elements.rssInput.classList.remove('is-invalid');
      errorElements.forEach((errorElement) => errorElement.remove());
    }
    errors.forEach((error) => {
      rssInput.classList.add('is-invalid');
      const feedbackElement = document.createElement('div');
      feedbackElement.classList.add('feedback', 'text-danger');
      feedbackElement.innerHTML = error;
      rssForm.after(feedbackElement);
    });
  };

  const renderSuccess = (result) => {
    const { rssForm } = elements;
    const successElements = document.querySelectorAll('.text-success');
    if (successElements.length > 0) {
      successElements.forEach((errorElement) => errorElement.remove());
    }
    if (result === false) {
      return;
    }
    const feedbackElement = document.createElement('div');
    feedbackElement.classList.add('feedback', 'text-success');
    feedbackElement.innerHTML = i18next.t('loadedMessage');
    rssForm.after(feedbackElement);
  };

  watch(state.form, 'value', () => {
    const { rssInput } = elements;
    rssInput.value = state.form.value;
  });

  watch(state.form, 'state', () => {
    const { rssButton } = elements;
    renderSuccess(false);
    switch (state.form.state) {
      case 'filling':
        rssButton.disabled = false;
        break;
      case 'processing':
      case 'errored':
        rssButton.disabled = true;
        break;
      case 'completed':
        rssButton.disabled = false;
        renderSuccess(true);
        break;
      default:
        throw new Error(`Not supported form state: ${state.form.state}`);
    }
  });

  watch(state, 'errors', () => {
    const errors = _.values(state.errors).filter((error) => error !== null);
    renderErrors(errors);
    const { rssButton } = elements;
    rssButton.disabled = state.errors.validation !== null;
  });

  watch(state, 'feeds', () => {
    document.querySelectorAll('.text-muted').forEach((element) => element.remove());
    state.feeds.forEach((feed) => {
      const p = document.createElement('p');
      p.classList.add('text-muted');
      p.textContent = feed.link;
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

export default startWatch;
