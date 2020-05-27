import Watchjs from 'melanke-watchjs';

const startWatch = (state, elements) => {
  const { watch } = Watchjs;

  const renderError = (error) => {
    const { rssForm } = elements;
    const errorElement = rssForm.nextElementSibling;
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

  watch(state.form, 'error', () => {
    renderError(state.form.error);
    const rssButton = { elements };
    rssButton.disabled = !!state.form.error;
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
