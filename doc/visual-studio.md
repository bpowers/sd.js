Visual Studio development
=========================

Download the free 2015 Visual Studio Community edition from here:

https://www.visualstudio.com/en-us/downloads/download-visual-studio-vs.aspx

![installation options](1_vs_options.png)

In the installer, make sure you select `Git for Windows`, `Joyent
node.js`, and `GitHub Extensions`.

![open VS from start menu](2_open_vs.png)

![From the Team Explorer, clone the sd.js repo](3_vs_clone.png)

It probably makes sense from the github website to 'fork' a copy of
the repository into your personal account, which will make Pull
Requests easy.

![Install the Grunt Launcher extension](4_install_grunt_launcher.png)

Get to this dialog from the Tools -> Extensions and updates.

![Show the task runner explorer](5_show_task_runner_explorer.png)

Which is the way to do builds & run unit tests

![install gulp globally](6_install_gulp.png)

From a `cmd.exe` prompt, install gulp globally.  This is unfortunate
but necessary.

![Ready to open the project](7_open_solution.png)

From the Team Explorer on the right, choose the `SD` solution from the
Solutions tab towards the bottom right.

![Run unit tests](8_running_tests.png)

Now, from the task runner explorer, choose the 'test' task from under
the Gruntfile.  This should show some output ending with '67 passing'.

After editing code, re-run unit tests (and create new tests for new
functionality.
