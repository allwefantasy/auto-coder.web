import os
from setuptools import find_packages
from setuptools import setup

folder = os.path.dirname(__file__)
version_path = os.path.join(folder, "src", "auto_coder_web", "version.py")

__version__ = None
with open(version_path) as f:
    exec(f.read(), globals())

req_path = os.path.join(folder, "requirements.txt")
install_requires = []
if os.path.exists(req_path):
    with open(req_path) as fp:
        install_requires = [line.strip() for line in fp]

readme_path = os.path.join(folder, "README.md")
readme_contents = ""
if os.path.exists(readme_path):
    with open(readme_path) as fp:
        readme_contents = fp.read().strip()

setup(
    name="auto_coder_web",
    version=__version__,
    description="auto-coder.web: A Python Project",
    author="allwefantasy",
    long_description=readme_contents,
    long_description_content_type="text/markdown",
    package_dir={"": "src"},
    packages=find_packages("src"),    
    package_data={
        "auto_coder_web": ["web/**/*"],
    },
    entry_points={
        'console_scripts': [
            'auto-coder.web = auto_coder_web.proxy:main',
        ],
    },
    install_requires=install_requires,
    classifiers=[                
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    requires_python=">=3.10, <=3.12"
)