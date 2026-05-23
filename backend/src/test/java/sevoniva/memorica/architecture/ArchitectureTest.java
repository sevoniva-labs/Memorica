package sevoniva.memorica.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

class ArchitectureTest {

    static JavaClasses classes;

    @BeforeAll
    static void setUp() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("sevoniva.memorica");
    }

    @Test
    void controllersShouldBeInControllerPackage() {
        ArchRule rule = classes()
                .that().haveSimpleNameEndingWith("Controller")
                .should().resideInAPackage("..controller..");
        rule.check(classes);
    }

    @Test
    void servicesShouldBeInServicePackage() {
        ArchRule rule = classes()
                .that().haveSimpleNameEndingWith("Service")
                .should().resideInAPackage("..service..");
        rule.check(classes);
    }

    @Test
    void repositoriesShouldBeInRepositoryPackage() {
        ArchRule rule = classes()
                .that().haveSimpleNameEndingWith("Repository")
                .should().resideInAPackage("..repository..");
        rule.check(classes);
    }

    @Test
    void entitiesShouldBeInEntityPackage() {
        ArchRule rule = classes()
                .that().areAnnotatedWith(jakarta.persistence.Entity.class)
                .should().resideInAPackage("..entity..");
        rule.check(classes);
    }

    @Test
    void controllersShouldNotDependOnRepositoriesDirectly() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..controller..")
                .should().dependOnClassesThat().resideInAPackage("..repository..");
        rule.check(classes);
    }

    @Test
    void serviceClassesShouldNotDependOnControllerClasses() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..service..")
                .should().dependOnClassesThat().resideInAPackage("..controller..");
        rule.check(classes);
    }

    @Test
    void layeredArchitectureShouldBeRespected() {
        ArchRule rule = layeredArchitecture()
                .consideringAllDependencies()
                .layer("Controller").definedBy("..controller..")
                .layer("Service").definedBy("..service..")
                .layer("Repository").definedBy("..repository..")
                .layer("Security").definedBy("..security..")
                .layer("Config").definedBy("..config..")
                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Security")
                .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service", "Security");
        rule.check(classes);
    }

}
