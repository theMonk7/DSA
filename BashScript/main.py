import json

# open json file
with open("config.json", "r") as fd:
    config = json.load(fd)

dependent_files = config.get('download_dependent_artifacts')
run_script = config.get('run_script')
copy_files = config.get('copy_dependent_artifacts')
artifact_files = config.get('artifacts')
tag = config.get('tag', 'abd')   # default value

print("Dependent files:", dependent_files)
print("Run script:", run_script)
print("Copy files:", copy_files)
print("Artifacts:", artifact_files)
print("Tag:", tag)