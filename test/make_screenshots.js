var page = require('webpage').create();
page.viewportSize = { width: 1000, height: 1000 };
page.open('../index.html', function(status) {
    if (status !== 'success') {
            console.log('Unable to load the address!');
            phantom.exit(1);
        } else {
            window.setTimeout(function () {
                page.render("screenshots/index_html.png");
                phantom.exit();
            }, 50);
        }
});
